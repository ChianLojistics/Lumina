import { Injectable, Logger } from '@nestjs/common';
import { L2CacheService } from './l2-cache.service';
import { CacheInvalidationStrategy } from '../interfaces/cache-layer.interface';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(private readonly l2Cache: L2CacheService) {}

  async invalidate(key: string, strategy?: CacheInvalidationStrategy): Promise<void> {
    if (!strategy) {
      // Simple deletion
      await this.l2Cache.delete(key);
      return;
    }

    // Time-based: let TTL handle it
    if (strategy.timeBased) {
      this.logger.debug(`Time-based invalidation for key: ${key} (TTL will expire)`);
      // No action needed, TTL will expire
    }

    // Event-based: immediate invalidation
    if (strategy.eventBased) {
      await this.l2Cache.delete(key);
      await this.publishInvalidation(key, strategy.eventBased.channels);
      this.logger.debug(`Event-based invalidation for key: ${key}`);
    }

    // Tag-based: invalidate all keys with tag
    if (strategy.tagBased) {
      const keys = await this.getKeysByTags(strategy.tagBased.tags);
      if (keys.length > 0) {
        // Delete keys in batches to avoid issues with spread operators
        for (const key of keys) {
          await this.l2Cache.delete(key);
        }
        this.logger.debug(`Tag-based invalidation for ${keys.length} keys with tags: ${strategy.tagBased.tags.join(', ')}`);
      }
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    return this.l2Cache.invalidateByTag(tag);
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;
    for (const tag of tags) {
      totalInvalidated += await this.invalidateByTag(tag);
    }
    return totalInvalidated;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.l2Cache.getKeys(pattern);
    if (keys.length > 0) {
      // Delete keys in batches to avoid issues with spread operators
      for (const key of keys) {
        await this.l2Cache.delete(key);
      }
      this.logger.debug(`Pattern invalidation for ${keys.length} keys matching: ${pattern}`);
    }
    return keys.length;
  }

  private async publishInvalidation(key: string, channels: string[]): Promise<void> {
    await this.l2Cache.publishInvalidation(key, channels);
  }

  private async getKeysByTags(tags: string[]): Promise<string[]> {
    const allKeys = new Set<string>();
    for (const tag of tags) {
      const keys = await this.l2Cache.getByTag(tag);
      keys.forEach(key => allKeys.add(key));
    }
    return Array.from(allKeys);
  }

  async subscribeInvalidation(channel: string, callback: (key: string) => void): Promise<void> {
    await this.l2Cache.subscribeInvalidation(channel, callback);
  }

  async invalidateMultiple(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    // Delete keys in batches to avoid issues with spread operators
    for (const key of keys) {
      await this.l2Cache.delete(key);
    }
    this.logger.debug(`Invalidated ${keys.length} keys`);
    return keys.length;
  }
}
