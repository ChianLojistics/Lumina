import { Injectable, Logger } from '@nestjs/common';
import { L1CacheService } from './l1-cache.service';
import { L2CacheService } from './l2-cache.service';
import { L3CacheService } from './l3-cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { CacheStampedeProtection } from './cache-stampede-protection.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    private readonly l1Cache: L1CacheService,
    private readonly l2Cache: L2CacheService,
    private readonly l3Cache: L3CacheService,
    private readonly invalidationService: CacheInvalidationService,
    private readonly stampedeProtection: CacheStampedeProtection,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Try L1 first (fastest)
    const l1Value = await this.l1Cache.get<T>(key);
    if (l1Value !== null) {
      return l1Value;
    }

    // Try L2 (distributed)
    const l2Value = await this.l2Cache.get<T>(key);
    if (l2Value !== null) {
      // Promote to L1
      await this.l1Cache.set(key, l2Value);
      return l2Value;
    }

    // Try L3 (CDN)
    const l3Value = await this.l3Cache.get<T>(key);
    if (l3Value !== null) {
      // Promote to L2 and L1
      await this.l2Cache.set(key, l3Value);
      await this.l1Cache.set(key, l3Value);
      return l3Value;
    }

    return null;
  }

  async getWithFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    return this.stampedeProtection.get(key, fetcher, ttl);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in all layers
    await Promise.all([
      this.l1Cache.set(key, value, ttl),
      this.l2Cache.set(key, value, ttl),
      this.l3Cache.set(key, value, ttl),
    ]);
  }

  async delete(key: string): Promise<void> {
    // Delete from all layers
    await Promise.all([
      this.l1Cache.delete(key),
      this.l2Cache.delete(key),
      this.l3Cache.delete(key),
    ]);
  }

  async clear(): Promise<void> {
    // Clear all layers
    await Promise.all([
      this.l1Cache.clear(),
      this.l2Cache.clear(),
      this.l3Cache.clear(),
    ]);
  }

  async has(key: string): Promise<boolean> {
    // Check L1 first
    const l1Has = await this.l1Cache.has(key);
    if (l1Has) return true;

    // Check L2
    const l2Has = await this.l2Cache.has(key);
    if (l2Has) return true;

    // Check L3
    return this.l3Cache.has(key);
  }

  async invalidate(key: string, tags?: string[]): Promise<void> {
    await this.invalidationService.invalidate(key, { tagBased: tags ? { tags } : undefined });
  }

  async invalidateByTag(tag: string): Promise<number> {
    return this.invalidationService.invalidateByTag(tag);
  }

  async setTags(key: string, tags: string[]): Promise<void> {
    await Promise.all([
      this.l1Cache.setTags(key, tags),
      this.l2Cache.setTags(key, tags),
    ]);
  }

  async getByTag(tag: string): Promise<string[]> {
    // Get keys from L2 (most comprehensive)
    return this.l2Cache.getByTag(tag);
  }

  async getStats() {
    const [l1Stats, l2Stats, l3Stats] = await Promise.all([
      this.l1Cache.getStats(),
      this.l2Cache.getStats(),
      this.l3Cache.getStats(),
    ]);

    const totalHits = l1Stats.hits + l2Stats.hits + l3Stats.hits;
    const totalMisses = l1Stats.misses + l2Stats.misses + l3Stats.misses;
    const totalRequests = totalHits + totalMisses;

    return {
      l1: l1Stats,
      l2: l2Stats,
      l3: l3Stats,
      overall: {
        hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
        totalHits,
        totalMisses,
        totalRequests,
      },
    };
  }

  async getKeys(pattern?: string): Promise<string[]> {
    return this.l2Cache.getKeys(pattern);
  }

  async getSize(): Promise<number> {
    return this.l2Cache.getSize();
  }

  async healthCheck(): Promise<{
    l1: boolean;
    l2: boolean;
    l3: boolean;
  }> {
    const l2Health = await this.l2Cache.healthCheck();
    
    return {
      l1: true, // L1 is in-memory, always healthy
      l2: l2Health,
      l3: true, // L3 health is provider-dependent
    };
  }
}
