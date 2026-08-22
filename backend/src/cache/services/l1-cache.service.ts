import { Injectable, Logger } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { CacheLayer, CacheStats, CacheEntry } from '../interfaces/cache-layer.interface';

@Injectable()
export class L1CacheService implements CacheLayer {
  private readonly logger = new Logger(L1CacheService.name);
  private cache: LRUCache<string, CacheEntry<any>>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor() {
    const maxSize = parseInt(process.env.L1_CACHE_MAX_SIZE || '1000', 10);
    const defaultTtl = parseInt(process.env.L1_CACHE_DEFAULT_TTL || '60', 10) * 1000;

    this.cache = new LRUCache<string, CacheEntry<any>>({
      max: maxSize,
      ttl: defaultTtl,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
      dispose: (value, key) => {
        this.stats.evictions++;
        this.logger.debug(`L1 cache evicted key: ${key}`);
      },
    });

    this.logger.log(`L1 cache initialized with max size: ${maxSize}, TTL: ${defaultTtl}ms`);
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (entry) {
      if (entry.expiresAt > Date.now()) {
        this.stats.hits++;
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.cache.set(key, entry);
        this.logger.debug(`L1 cache hit for key: ${key}`);
        return entry.value as T;
      } else {
        this.cache.delete(key);
        this.logger.debug(`L1 cache expired for key: ${key}`);
      }
    }

    this.stats.misses++;
    this.logger.debug(`L1 cache miss for key: ${key}`);
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const defaultTtl = parseInt(process.env.L1_CACHE_DEFAULT_TTL || '60', 10) * 1000;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl || defaultTtl),
      tags: [],
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.logger.debug(`L1 cache set for key: ${key}, TTL: ${ttl || defaultTtl}ms`);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.logger.debug(`L1 cache deleted key: ${key}`);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.logger.log('L1 cache cleared');
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return true;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return false;
  }

  async getStats(): Promise<CacheStats> {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      evictions: this.stats.evictions,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      avgLatency: 0, // L1 is sub-millisecond, negligible
    };
  }

  async setTags(key: string, tags: string[]): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.tags = tags;
      this.cache.set(key, entry);
    }
  }

  async getByTag(tag: string): Promise<string[]> {
    const keys: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag) && entry.expiresAt > Date.now()) {
        keys.push(key);
      }
    }
    return keys;
  }

  async getKeys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async getSize(): Promise<number> {
    return this.cache.size;
  }

  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }
}
