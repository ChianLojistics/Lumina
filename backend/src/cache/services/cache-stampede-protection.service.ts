import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { L2CacheService } from './l2-cache.service';

@Injectable()
export class CacheStampedeProtection {
  private readonly logger = new Logger(CacheStampedeProtection.name);
  private locks = new Map<string, Promise<any>>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly l2Cache: L2CacheService,
  ) {}

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Check cache first
    const cached = await this.cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already a fetch in progress
    if (this.locks.has(key)) {
      this.logger.debug(`Waiting for existing fetch for key: ${key}`);
      const existingLock = this.locks.get(key);
      if (existingLock) {
        return await existingLock;
      }
    }

    // Create new fetch promise
    const fetchPromise = this.fetchWithLock(key, fetcher, ttl);
    this.locks.set(key, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      this.locks.delete(key);
    }
  }

  private async fetchWithLock<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Set a temporary lock in Redis
    const lockKey = `lock:${key}`;
    const lockValue = `${process.pid}:${Date.now()}`;
    const lockTtl = 5000; // 5 seconds

    try {
      const acquired = await this.l2Cache['redis'].set(lockKey, lockValue, 'PX', lockTtl, 'NX');

      if (acquired === 'OK') {
        this.logger.debug(`Lock acquired for key: ${key}`);
        try {
          // Fetch the value
          const value = await fetcher();
          
          // Store in cache
          await this.cacheService.set(key, value, ttl);
          
          return value;
        } finally {
          // Release lock
          await this.releaseLock(lockKey, lockValue);
        }
      } else {
        // Lock not acquired, wait and retry cache
        this.logger.debug(`Lock not acquired for key: ${key}, waiting...`);
        await this.sleep(100);
        
        // Retry cache
        const cached = await this.cacheService.get<T>(key);
        if (cached !== null) {
          return cached;
        }
        
        // If still not in cache, fetch anyway (fallback)
        const value = await fetcher();
        await this.cacheService.set(key, value, ttl);
        return value;
      }
    } catch (error) {
      this.logger.error(`Error in fetchWithLock for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      // Fallback to direct fetch
      const value = await fetcher();
      await this.cacheService.set(key, value, ttl);
      return value;
    }
  }

  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await this.l2Cache['redis'].eval(script, 1, lockKey, lockValue);
      this.logger.debug(`Lock released: ${lockKey}`);
    } catch (error) {
      this.logger.error(`Error releasing lock ${lockKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getActiveLocks(): string[] {
    return Array.from(this.locks.keys());
  }

  clearLocks(): void {
    this.locks.clear();
    this.logger.debug('All local locks cleared');
  }
}
