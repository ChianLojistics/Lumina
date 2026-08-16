import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryDelay?: number; // Delay between retry attempts in milliseconds
  maxRetries?: number; // Maximum number of retry attempts
}

@Injectable()
export class DistributedLockService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);
  private redis: Redis;
  private readonly DEFAULT_TTL = 30000; // 30 seconds
  private readonly DEFAULT_RETRY_DELAY = 100; // 100ms
  private readonly DEFAULT_MAX_RETRIES = 10;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for distributed locking');
    });
  }

  onModuleDestroy() {
    this.redis.quit();
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    key: string,
    identifier: string,
    options: LockOptions = {},
  ): Promise<boolean> {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const retryDelay = options.retryDelay || this.DEFAULT_RETRY_DELAY;
    const maxRetries = options.maxRetries || this.DEFAULT_MAX_RETRIES;

    const lockKey = `lock:${key}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Use SET with NX (only set if not exists) and EX (expire)
        const result = await this.redis.set(lockKey, identifier, 'PX', ttl, 'NX');

        if (result === 'OK') {
          this.logger.debug(`Lock acquired for key: ${key}`);
          return true;
        }

        // Lock not acquired, wait before retry
        if (attempt < maxRetries - 1) {
          await this.sleep(retryDelay);
        }
      } catch (error) {
        this.logger.error(`Failed to acquire lock for ${key}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    this.logger.warn(`Failed to acquire lock for ${key} after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string, identifier: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    try {
      // Use Lua script to ensure atomic check-and-delete
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, lockKey, identifier);

      if (result === 1) {
        this.logger.debug(`Lock released for key: ${key}`);
        return true;
      } else {
        this.logger.warn(`Lock not owned by this identifier for key: ${key}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to release lock for ${key}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Extend lock TTL
   */
  async extendLock(
    key: string,
    identifier: string,
    additionalTtl: number,
  ): Promise<boolean> {
    const lockKey = `lock:${key}`;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, lockKey, identifier, additionalTtl);

      if (result === 1) {
        this.logger.debug(`Lock extended for key: ${key}`);
        return true;
      } else {
        this.logger.warn(`Lock not owned by this identifier for key: ${key}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to extend lock for ${key}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if lock is held
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const result = await this.redis.exists(lockKey);
    return result === 1;
  }

  /**
   * Get lock owner
   */
  async getLockOwner(key: string): Promise<string | null> {
    const lockKey = `lock:${key}`;
    return this.redis.get(lockKey);
  }

  /**
   * Execute function with lock
   */
  async withLock<T>(
    key: string,
    identifier: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    const acquired = await this.acquireLock(key, identifier, options);

    if (!acquired) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, identifier);
    }
  }

  /**
   * Execute function with lock and automatic extension
   */
  async withLockAndAutoExtend<T>(
    key: string,
    identifier: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    const ttl = options?.ttl || this.DEFAULT_TTL;
    const acquired = await this.acquireLock(key, identifier, options);

    if (!acquired) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }

    // Start auto-extension timer
    const extendInterval = setInterval(async () => {
      await this.extendLock(key, identifier, ttl);
    }, ttl / 2);

    try {
      return await fn();
    } finally {
      clearInterval(extendInterval);
      await this.releaseLock(key, identifier);
    }
  }

  /**
   * Get all active locks
   */
  async getActiveLocks(): Promise<string[]> {
    const keys = await this.redis.keys('lock:*');
    return keys.map(key => key.replace('lock:', ''));
  }

  /**
   * Force release lock (admin operation)
   */
  async forceReleaseLock(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const result = await this.redis.del(lockKey);
    this.logger.warn(`Force released lock for key: ${key}`);
    return result > 0;
  }

  /**
   * Clear all locks (admin operation - use with caution)
   */
  async clearAllLocks(): Promise<number> {
    const keys = await this.redis.keys('lock:*');
    if (keys.length === 0) {
      return 0;
    }
    const result = await this.redis.del(...keys);
    this.logger.warn(`Cleared all locks: ${result} locks removed`);
    return result;
  }

  /**
   * Get lock statistics
   */
  async getLockStats(): Promise<{
    activeLocks: number;
    totalLocksAcquired: number;
    totalLocksReleased: number;
  }> {
    const activeLocks = await this.getActiveLocks();
    
    // These counters would need to be implemented with Redis counters
    // For now, return basic stats
    return {
      activeLocks: activeLocks.length,
      totalLocksAcquired: 0,
      totalLocksReleased: 0,
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
