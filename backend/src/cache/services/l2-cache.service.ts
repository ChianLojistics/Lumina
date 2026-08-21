import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Cluster } from 'ioredis';
import { CacheLayer, CacheStats, CacheEntry } from '../interfaces/cache-layer.interface';

@Injectable()
export class L2CacheService implements CacheLayer, OnModuleDestroy {
  private readonly logger = new Logger(L2CacheService.name);
  private redis: Redis | Cluster;
  private stats = {
    hits: 0,
    misses: 0,
  };
  private clusterEnabled: boolean;

  constructor() {
    this.clusterEnabled = process.env.REDIS_CLUSTER_ENABLED === 'true';

    if (this.clusterEnabled) {
      const nodes = this.parseClusterNodes();
      this.redis = new Cluster(nodes, {
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
        },
        scaleReads: 'slave',
      });
      this.logger.log(`L2 cache initialized with Redis cluster: ${nodes.length} nodes`);
    } else {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      });
      this.logger.log('L2 cache initialized with single Redis instance');
    }

    this.redis.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for L2 cache');
    });
  }

  private parseClusterNodes(): { host: string; port: number }[] {
    const nodesStr = process.env.REDIS_CLUSTER_NODES || 'localhost:6379';
    return nodesStr.split(',').map((node) => {
      const [host, port] = node.split(':');
      return { host, port: parseInt(port) };
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const data = await this.redis.get(key);
      if (data) {
        const entry: CacheEntry<T> = JSON.parse(data);
        if (entry.expiresAt > Date.now()) {
          this.stats.hits++;
          entry.accessCount++;
          entry.lastAccessed = Date.now();
          await this.redis.set(key, JSON.stringify(entry));
          this.logger.debug(`L2 cache hit for key: ${key}`);
          return entry.value;
        } else {
          await this.redis.del(key);
          this.logger.debug(`L2 cache expired for key: ${key}`);
        }
      }
      this.stats.misses++;
      this.logger.debug(`L2 cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`L2 cache get error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const defaultTtl = parseInt(process.env.L2_CACHE_DEFAULT_TTL || '3600', 10) * 1000;
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl || defaultTtl),
      tags: [],
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    try {
      await this.redis.set(key, JSON.stringify(entry));
      await this.redis.pexpire(key, ttl || defaultTtl);
      this.logger.debug(`L2 cache set for key: ${key}, TTL: ${ttl || defaultTtl}ms`);
    } catch (error) {
      this.logger.error(`L2 cache set error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`L2 cache deleted key: ${key}`);
    } catch (error) {
      this.logger.error(`L2 cache delete error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.logger.log('L2 cache cleared');
    } catch (error) {
      this.logger.error(`L2 cache clear error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        const entry: CacheEntry<any> = JSON.parse(data);
        if (entry.expiresAt > Date.now()) {
          return true;
        }
        await this.redis.del(key);
      }
      return false;
    } catch (error) {
      this.logger.error(`L2 cache has error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('stats');
      const keyspace = await this.redis.info('keyspace');
      const totalRequests = this.stats.hits + this.stats.misses;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size: parseInt(keyspace.split(':')[1]?.split('=')[1] || '0', 10),
        evictions: this.parseEvictionCount(info),
        hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
        avgLatency: await this.getAvgLatency(),
      };
    } catch (error) {
      this.logger.error(`L2 cache getStats error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size: 0,
        evictions: 0,
        hitRate: 0,
        avgLatency: 0,
      };
    }
  }

  private parseEvictionCount(info: string): number {
    const match = info.match(/evicted_keys:(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private async getAvgLatency(): Promise<number> {
    try {
      const info = await this.redis.info('stats');
      const match = info.match(/instantaneous_ops_per_sec:(\d+)/);
      return match ? parseFloat(match[1]) : 0;
    } catch {
      return 0;
    }
  }

  async setTags(key: string, tags: string[]): Promise<void> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        const entry: CacheEntry<any> = JSON.parse(data);
        entry.tags = tags;
        await this.redis.set(key, JSON.stringify(entry));
        
        // Add key to tag indexes
        for (const tag of tags) {
          await this.redis.sadd(`tag:${tag}`, key);
        }
      }
    } catch (error) {
      this.logger.error(`L2 cache setTags error for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getByTag(tag: string): Promise<string[]> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      const validKeys: string[] = [];
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const entry: CacheEntry<any> = JSON.parse(data);
          if (entry.expiresAt > Date.now()) {
            validKeys.push(key);
          }
        }
      }
      
      return validKeys;
    } catch (error) {
      this.logger.error(`L2 cache getByTag error for tag ${tag}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = await this.getByTag(tag);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
      }
      return keys.length;
    } catch (error) {
      this.logger.error(`L2 cache invalidateByTag error for tag ${tag}: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  async getKeys(pattern?: string): Promise<string[]> {
    try {
      if (pattern) {
        return await this.redis.keys(pattern);
      }
      return await this.redis.keys('*');
    } catch (error) {
      this.logger.error(`L2 cache getKeys error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getSize(): Promise<number> {
    try {
      const info = await this.redis.info('keyspace');
      const match = info.match(/db\d+:keys=(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
      this.logger.error(`L2 cache getSize error: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  async publishInvalidation(key: string, channels: string[]): Promise<void> {
    try {
      const message = JSON.stringify({ key, action: 'invalidate', timestamp: Date.now() });
      for (const channel of channels) {
        await this.redis.publish(channel, message);
        this.logger.debug(`Published invalidation for key ${key} to channel ${channel}`);
      }
    } catch (error) {
      this.logger.error(`L2 cache publishInvalidation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async subscribeInvalidation(channel: string, callback: (key: string) => void): Promise<void> {
    try {
      const subscriber = this.redis.duplicate();
      subscriber.subscribe(channel);
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message);
            if (data.action === 'invalidate') {
              callback(data.key);
            }
          } catch (error) {
            this.logger.error(`Error parsing invalidation message: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      });
      this.logger.debug(`Subscribed to invalidation channel: ${channel}`);
    } catch (error) {
      this.logger.error(`L2 cache subscribeInvalidation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`L2 cache health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.quit();
    }
  }
}
