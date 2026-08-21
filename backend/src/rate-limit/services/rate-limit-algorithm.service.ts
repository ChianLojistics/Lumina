import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { RateLimitAlgorithm, RateLimitConfig } from '../entities/rate-limit-policy.entity';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
  retryAfter?: number;
}

@Injectable()
export class RateLimitAlgorithmService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitAlgorithmService.name);
  private readonly limiters = new Map<string, RateLimiterRedis | RateLimiterMemory>();
  private readonly fallbackLimiters = new Map<string, RateLimiterMemory>();
  private redis: Redis;
  private redisAvailable = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
      });

      this.redis.on('error', (error) => {
        this.logger.error(`Redis error: ${error.message}`);
        this.redisAvailable = false;
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis for rate limiting');
        this.redisAvailable = true;
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.redisAvailable = false;
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error instanceof Error ? error.message : String(error)}`);
      this.redisAvailable = false;
    }
  }

  async checkLimit(
    key: string,
    algorithm: RateLimitAlgorithm,
    config: RateLimitConfig,
    useRedis: boolean = true,
  ): Promise<RateLimitResult> {
    const shouldUseRedis = useRedis && this.redisAvailable;
    
    try {
      const limiter = this.getOrCreateLimiter(key, algorithm, config, shouldUseRedis);
      const result = await limiter.consume(key, 1);

      return {
        allowed: true,
        remaining: result.remainingPoints,
        reset: new Date(result.msBeforeNext + Date.now()).getTime(),
        limit: config.requestsPerSecond,
      };
    } catch (rejRes: any) {
      const retryAfter = Math.ceil((rejRes.msBeforeNext || 60000) / 1000);
      return {
        allowed: false,
        remaining: 0,
        reset: new Date((rejRes.msBeforeNext || 60000) + Date.now()).getTime(),
        limit: config.requestsPerSecond,
        retryAfter,
      };
    }
  }

  async resetLimit(key: string): Promise<void> {
    const limiter = this.limiters.get(key);
    if (limiter) {
      await limiter.delete(key);
    }
    const fallbackLimiter = this.fallbackLimiters.get(key);
    if (fallbackLimiter) {
      await fallbackLimiter.delete(key);
    }
  }

  private getOrCreateLimiter(
    key: string,
    algorithm: RateLimitAlgorithm,
    config: RateLimitConfig,
    useRedis: boolean,
  ): RateLimiterRedis | RateLimiterMemory {
    const limiterKey = `${algorithm}:${key}`;

    if (useRedis && this.redis) {
      if (!this.limiters.has(limiterKey)) {
        const limiter = this.createRedisLimiter(algorithm, config);
        this.limiters.set(limiterKey, limiter);
      }
      return this.limiters.get(limiterKey)!;
    }

    if (!this.fallbackLimiters.has(limiterKey)) {
      const limiter = this.createMemoryLimiter(algorithm, config);
      this.fallbackLimiters.set(limiterKey, limiter);
    }
    return this.fallbackLimiters.get(limiterKey)!;
  }

  private createRedisLimiter(
    algorithm: RateLimitAlgorithm,
    config: RateLimitConfig,
  ): RateLimiterRedis {
    const points = config.burstCapacity || config.requestsPerSecond;
    const duration = config.windowSize || 1;

    switch (algorithm) {
      case RateLimitAlgorithm.TOKEN_BUCKET:
        return new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: 'token_bucket',
          points,
          duration,
          execEvenly: true,
          execEvenlyMinDelayMs: (duration * 1000) / points,
        });

      case RateLimitAlgorithm.SLIDING_WINDOW:
        return new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: 'sliding_window',
          points,
          duration,
        });

      case RateLimitAlgorithm.LEAKY_BUCKET:
        return new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: 'leaky_bucket',
          points,
          duration,
          execEvenly: true,
          execEvenlyMinDelayMs: (duration * 1000) / points,
        });

      default:
        return new RateLimiterRedis({
          storeClient: this.redis,
          keyPrefix: 'default',
          points,
          duration,
        });
    }
  }

  private createMemoryLimiter(
    algorithm: RateLimitAlgorithm,
    config: RateLimitConfig,
  ): RateLimiterMemory {
    const points = config.burstCapacity || config.requestsPerSecond;
    const duration = config.windowSize || 1;

    switch (algorithm) {
      case RateLimitAlgorithm.TOKEN_BUCKET:
        return new RateLimiterMemory({
          points,
          duration,
          execEvenly: true,
          execEvenlyMinDelayMs: (duration * 1000) / points,
        });

      case RateLimitAlgorithm.SLIDING_WINDOW:
        return new RateLimiterMemory({
          points,
          duration,
        });

      case RateLimitAlgorithm.LEAKY_BUCKET:
        return new RateLimiterMemory({
          points,
          duration,
          execEvenly: true,
          execEvenlyMinDelayMs: (duration * 1000) / points,
        });

      default:
        return new RateLimiterMemory({
          points,
          duration,
        });
    }
  }

  async cleanup(): Promise<void> {
    this.limiters.clear();
    this.fallbackLimiters.clear();
    if (this.redis) {
      await this.redis.quit();
    }
  }

  onModuleDestroy(): void {
    this.cleanup().catch((error) => {
      this.logger.error(`Error during cleanup: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }
}
