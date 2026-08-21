import { Injectable, Logger } from '@nestjs/common';
import { L1CacheService } from './l1-cache.service';
import { L2CacheService } from './l2-cache.service';
import { L3CacheService } from './l3-cache.service';
import { CacheMetrics } from '../interfaces/cache-layer.interface';
import { MetricsService } from '../../common/metrics/metrics.service';
import * as client from 'prom-client';

@Injectable()
export class CacheMonitoringService {
  private readonly logger = new Logger(CacheMonitoringService.name);
  private metrics = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    l3Hits: 0,
    l3Misses: 0,
    totalRequests: 0,
  };

  // Custom cache metrics
  private readonly cacheL1Size: client.Gauge<string>;
  private readonly cacheL2Size: client.Gauge<string>;
  private readonly cacheL1Hits: client.Counter<string>;
  private readonly cacheL1Misses: client.Counter<string>;
  private readonly cacheL2Hits: client.Counter<string>;
  private readonly cacheL2Misses: client.Counter<string>;
  private readonly cacheL3Hits: client.Counter<string>;
  private readonly cacheL3Misses: client.Counter<string>;
  private readonly cacheHitRate: client.Gauge<string>;
  private readonly cacheLatency: client.Histogram<string>;
  private readonly cacheEvictions: client.Counter<string>;

  constructor(
    private readonly l1Cache: L1CacheService,
    private readonly l2Cache: L2CacheService,
    private readonly l3Cache: L3CacheService,
    private readonly prometheusMetrics: MetricsService,
  ) {
    const registry = this.prometheusMetrics.registry;

    this.cacheL1Size = new client.Gauge({
      name: 'cache_l1_size',
      help: 'L1 cache size',
      registers: [registry],
    });

    this.cacheL2Size = new client.Gauge({
      name: 'cache_l2_size',
      help: 'L2 cache size',
      registers: [registry],
    });

    this.cacheL1Hits = new client.Counter({
      name: 'cache_l1_hits_total',
      help: 'L1 cache hits total',
      registers: [registry],
    });

    this.cacheL1Misses = new client.Counter({
      name: 'cache_l1_misses_total',
      help: 'L1 cache misses total',
      registers: [registry],
    });

    this.cacheL2Hits = new client.Counter({
      name: 'cache_l2_hits_total',
      help: 'L2 cache hits total',
      registers: [registry],
    });

    this.cacheL2Misses = new client.Counter({
      name: 'cache_l2_misses_total',
      help: 'L2 cache misses total',
      registers: [registry],
    });

    this.cacheL3Hits = new client.Counter({
      name: 'cache_l3_hits_total',
      help: 'L3 cache hits total',
      registers: [registry],
    });

    this.cacheL3Misses = new client.Counter({
      name: 'cache_l3_misses_total',
      help: 'L3 cache misses total',
      registers: [registry],
    });

    this.cacheHitRate = new client.Gauge({
      name: 'cache_hit_rate',
      help: 'Overall cache hit rate',
      registers: [registry],
    });

    this.cacheLatency = new client.Histogram({
      name: 'cache_latency_seconds',
      help: 'Cache operation latency in seconds',
      labelNames: ['layer'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [registry],
    });

    this.cacheEvictions = new client.Counter({
      name: 'cache_evictions_total',
      help: 'Cache evictions total',
      registers: [registry],
    });
  }

  async getMetrics(): Promise<CacheMetrics> {
    const [l1Stats, l2Stats, l3Stats] = await Promise.all([
      this.l1Cache.getStats(),
      this.l2Cache.getStats(),
      this.l3Cache.getStats(),
    ]);

    const totalHits = l1Stats.hits + l2Stats.hits + l3Stats.hits;
    const totalMisses = l1Stats.misses + l2Stats.misses + l3Stats.misses;
    const totalRequests = totalHits + totalMisses;

    // Update Prometheus metrics
    this.cacheL1Size.set(l1Stats.size);
    this.cacheL2Size.set(l2Stats.size);
    this.cacheHitRate.set(totalRequests > 0 ? totalHits / totalRequests : 0);
    this.cacheEvictions.inc(l1Stats.evictions + l2Stats.evictions);

    return {
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
      avgLatency: (l1Stats.avgLatency + l2Stats.avgLatency + l3Stats.avgLatency) / 3,
      size: l1Stats.size + l2Stats.size,
      evictionCount: l1Stats.evictions + l2Stats.evictions,
      keyspaceHits: l2Stats.hits,
      keyspaceMisses: l2Stats.misses,
      l1Hits: l1Stats.hits,
      l2Hits: l2Stats.hits,
      l3Hits: l3Stats.hits,
      totalRequests,
    };
  }

  async getTopKeys(limit: number = 100): Promise<Array<{ key: string; hits: number }>> {
    try {
      // In Redis, we can use the HOTKEYS command (Redis 7.2+)
      // For older versions, we'll use a custom implementation
      const keys = await this.l2Cache.getKeys();
      const keyStats: Array<{ key: string; hits: number }> = [];

      for (const key of keys.slice(0, limit * 2)) {
        try {
          const data = await this.l2Cache['redis'].get(key);
          if (data) {
            const entry = JSON.parse(data);
            keyStats.push({
              key,
              hits: entry.accessCount || 0,
            });
          }
        } catch (error) {
          // Skip keys that can't be parsed
        }
      }

      return keyStats.sort((a, b) => b.hits - a.hits).slice(0, limit);
    } catch (error) {
      this.logger.error(`Error getting top keys: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getCacheSizeByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.l2Cache.getKeys(pattern);
      return keys.length;
    } catch (error) {
      this.logger.error(`Error getting cache size for pattern ${pattern}: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  async getMemoryUsage(): Promise<{
    l1: number;
    l2: number;
    total: number;
  }> {
    try {
      const l1Size = await this.l1Cache.getSize();
      const l2Info = await this.l2Cache['redis'].info('memory');
      const l2UsedMemory = this.parseMemoryInfo(l2Info);

      return {
        l1: l1Size * 1024, // Estimate: 1KB per entry
        l2: l2UsedMemory,
        total: l1Size * 1024 + l2UsedMemory,
      };
    } catch (error) {
      this.logger.error(`Error getting memory usage: ${error instanceof Error ? error.message : String(error)}`);
      return { l1: 0, l2: 0, total: 0 };
    }
  }

  private parseMemoryInfo(info: string): number {
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getLatencyMetrics(): Promise<{
    l1: number;
    l2: number;
    l3: number;
    avg: number;
  }> {
    const [l1Stats, l2Stats, l3Stats] = await Promise.all([
      this.l1Cache.getStats(),
      this.l2Cache.getStats(),
      this.l3Cache.getStats(),
    ]);

    return {
      l1: l1Stats.avgLatency,
      l2: l2Stats.avgLatency,
      l3: l3Stats.avgLatency,
      avg: (l1Stats.avgLatency + l2Stats.avgLatency + l3Stats.avgLatency) / 3,
    };
  }

  async getEvictionRate(): Promise<{
    l1: number;
    l2: number;
    total: number;
  }> {
    const [l1Stats, l2Stats] = await Promise.all([
      this.l1Cache.getStats(),
      this.l2Cache.getStats(),
    ]);

    return {
      l1: l1Stats.evictions,
      l2: l2Stats.evictions,
      total: l1Stats.evictions + l2Stats.evictions,
    };
  }

  recordCacheHit(layer: 'l1' | 'l2' | 'l3'): void {
    this.metrics.totalRequests++;
    if (layer === 'l1') {
      this.metrics.l1Hits++;
      this.cacheL1Hits.inc();
    } else if (layer === 'l2') {
      this.metrics.l2Hits++;
      this.cacheL2Hits.inc();
    } else {
      this.metrics.l3Hits++;
      this.cacheL3Hits.inc();
    }
  }

  recordCacheMiss(layer: 'l1' | 'l2' | 'l3'): void {
    this.metrics.totalRequests++;
    if (layer === 'l1') {
      this.metrics.l1Misses++;
      this.cacheL1Misses.inc();
    } else if (layer === 'l2') {
      this.metrics.l2Misses++;
      this.cacheL2Misses.inc();
    } else {
      this.metrics.l3Misses++;
      this.cacheL3Misses.inc();
    }
  }

  recordLatency(layer: 'l1' | 'l2' | 'l3', latency: number): void {
    this.cacheLatency.observe({ layer }, latency);
  }

  resetMetrics(): void {
    this.metrics = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      l3Hits: 0,
      l3Misses: 0,
      totalRequests: 0,
    };
    this.l1Cache.resetStats();
    this.l2Cache.resetStats();
    this.l3Cache.resetStats();
  }

  getRealtimeMetrics() {
    return {
      ...this.metrics,
      hitRate: this.metrics.totalRequests > 0 
        ? (this.metrics.l1Hits + this.metrics.l2Hits + this.metrics.l3Hits) / this.metrics.totalRequests 
        : 0,
    };
  }
}
