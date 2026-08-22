import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';
import { L2CacheService } from './l2-cache.service';
import { CacheWarmupConfig } from '../interfaces/cache-layer.interface';

@Injectable()
export class CacheWarmupService {
  private readonly logger = new Logger(CacheWarmupService.name);
  private config: CacheWarmupConfig;
  private isWarmingUp = false;

  constructor(
    private readonly cacheService: CacheService,
    private readonly l2Cache: L2CacheService,
  ) {
    this.config = {
      patterns: process.env.CACHE_WARMUP_PATTERNS?.split(',') || [
        'merchant:config:*',
        'payment:methods:*',
        'exchange:rates:*',
      ],
      schedule: process.env.CACHE_WARMUP_SCHEDULE || '0 * * * *', // Every hour
      enabled: process.env.CACHE_WARMUP_ENABLED === 'true',
      maxConcurrent: parseInt(process.env.CACHE_WARMUP_MAX_CONCURRENT || '10', 10),
    };

    if (this.config.enabled) {
      this.logger.log(`Cache warmup enabled with ${this.config.patterns.length} patterns`);
    } else {
      this.logger.log('Cache warmup disabled');
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledWarmup(): Promise<void> {
    if (!this.config.enabled || this.isWarmingUp) {
      return;
    }

    // Only run during low traffic periods (2-4 AM)
    const hour = new Date().getHours();
    if (hour < 2 || hour >= 4) {
      this.logger.debug('Skipping warmup - not in low traffic period');
      return;
    }

    await this.warmupCriticalData();
  }

  async warmupCriticalData(): Promise<void> {
    if (this.isWarmingUp) {
      this.logger.warn('Warmup already in progress, skipping');
      return;
    }

    this.isWarmingUp = true;
    this.logger.log('Starting cache warmup for critical data');

    try {
      for (const pattern of this.config.patterns) {
        await this.warmupPattern(pattern);
      }
      this.logger.log('Cache warmup completed');
    } catch (error) {
      this.logger.error(`Error during cache warmup: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isWarmingUp = false;
    }
  }

  private async warmupPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.l2Cache.getKeys(pattern);
      this.logger.debug(`Found ${keys.length} keys matching pattern: ${pattern}`);

      // Process in batches to avoid overwhelming the system
      const batchSize = this.config.maxConcurrent;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await Promise.all(batch.map(key => this.warmupKey(key)));
      }
    } catch (error) {
      this.logger.error(`Error warming up pattern ${pattern}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async warmupKey(key: string): Promise<void> {
    try {
      // Check if already in cache
      const cached = await this.cacheService.get(key);
      if (cached !== null) {
        return;
      }

      // In a real implementation, this would fetch from the database
      // For now, we'll just log the warmup action
      this.logger.debug(`Warming up key: ${key} (would fetch from database)`);
      
      // Example: const value = await this.database.get(key);
      // await this.cacheService.set(key, value);
    } catch (error) {
      this.logger.error(`Error warming up key ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async warmupKeys(keys: string[]): Promise<void> {
    this.logger.log(`Warming up ${keys.length} specific keys`);
    
    const batchSize = this.config.maxConcurrent;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await Promise.all(batch.map(key => this.warmupKey(key)));
    }
  }

  async addWarmupPattern(pattern: string): Promise<void> {
    if (!this.config.patterns.includes(pattern)) {
      this.config.patterns.push(pattern);
      this.logger.log(`Added warmup pattern: ${pattern}`);
    }
  }

  async removeWarmupPattern(pattern: string): Promise<void> {
    const index = this.config.patterns.indexOf(pattern);
    if (index > -1) {
      this.config.patterns.splice(index, 1);
      this.logger.log(`Removed warmup pattern: ${pattern}`);
    }
  }

  getWarmupPatterns(): string[] {
    return [...this.config.patterns];
  }

  isWarmupInProgress(): boolean {
    return this.isWarmingUp;
  }

  async enableWarmup(): Promise<void> {
    this.config.enabled = true;
    this.logger.log('Cache warmup enabled');
  }

  async disableWarmup(): Promise<void> {
    this.config.enabled = false;
    this.logger.log('Cache warmup disabled');
  }
}
