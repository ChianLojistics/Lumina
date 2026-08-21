import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(@InjectRedis() private readonly redis: Redis) {}

  private getCacheKey(merchantId: string, type: string, params: Record<string, any> = {}): string {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return `analytics:${merchantId}:${type}${paramString ? `:${paramString}` : ''}`;
  }

  async get<T>(merchantId: string, type: string, params: Record<string, any> = {}): Promise<T | null> {
    try {
      const key = this.getCacheKey(merchantId, type, params);
      const cached = await this.redis.get(key);
      
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(cached) as T;
      }
      
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  async set<T>(merchantId: string, type: string, data: T, params: Record<string, any> = {}, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const key = this.getCacheKey(merchantId, type, params);
      await this.redis.setex(key, ttl, JSON.stringify(data));
      this.logger.debug(`Cached data for key: ${key} with TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache set error: ${error.message}`);
    }
  }

  async invalidate(merchantId: string, type?: string): Promise<void> {
    try {
      const pattern = type 
        ? `analytics:${merchantId}:${type}*`
        : `analytics:${merchantId}:*`;
      
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache invalidation error: ${error.message}`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache pattern invalidation error: ${error.message}`);
    }
  }

  async getMetrics(merchantId: string, timeRange: string): Promise<any> {
    return this.get(merchantId, 'metrics', { timeRange });
  }

  async setMetrics(merchantId: string, timeRange: string, data: any): Promise<void> {
    await this.set(merchantId, 'metrics', data, { timeRange }, 300); // 5 minutes
  }

  async getForecast(merchantId: string, scenario: string, days: number): Promise<any> {
    return this.get(merchantId, 'forecast', { scenario, days });
  }

  async setForecast(merchantId: string, scenario: string, days: number, data: any): Promise<void> {
    await this.set(merchantId, 'forecast', data, { scenario, days }, 600); // 10 minutes
  }

  async getCustomerAnalytics(merchantId: string): Promise<any> {
    return this.get(merchantId, 'customers');
  }

  async setCustomerAnalytics(merchantId: string, data: any): Promise<void> {
    await this.set(merchantId, 'customers', data, {}, 600); // 10 minutes
  }

  async warmCache(merchantId: string): Promise<void> {
    this.logger.log(`Warming cache for merchant: ${merchantId}`);
    // This would be called by a scheduled job to pre-populate cache
    await this.invalidate(merchantId);
  }
}
