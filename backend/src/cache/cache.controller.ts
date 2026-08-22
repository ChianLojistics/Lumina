import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { CacheMonitoringService } from './services/cache-monitoring.service';
import { CacheWarmupService } from './services/cache-warmup.service';
import { PredictiveCacheService } from './services/predictive-cache.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { CacheKeyStrategy } from './strategies/cache-key.strategy';

@Controller('api/cache')
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly monitoringService: CacheMonitoringService,
    private readonly warmupService: CacheWarmupService,
    private readonly predictiveService: PredictiveCacheService,
    private readonly invalidationService: CacheInvalidationService,
    private readonly keyStrategy: CacheKeyStrategy,
  ) {}

  @Get('stats')
  async getStats() {
    return this.cacheService.getStats();
  }

  @Get('metrics')
  async getMetrics() {
    return this.monitoringService.getMetrics();
  }

  @Get('keys')
  async getKeys(@Body('pattern') pattern?: string) {
    return this.cacheService.getKeys(pattern);
  }

  @Get(':key')
  async getValue(@Param('key') key: string) {
    return this.cacheService.get(key);
  }

  @Post(':key')
  @HttpCode(HttpStatus.OK)
  async setValue(@Param('key') key: string, @Body('value') value: any, @Body('ttl') ttl?: number) {
    await this.cacheService.set(key, value, ttl);
    return { success: true };
  }

  @Delete(':key')
  async deleteKey(@Param('key') key: string) {
    await this.cacheService.delete(key);
    return { success: true };
  }

  @Post('invalidate/tag/:tag')
  async invalidateByTag(@Param('tag') tag: string) {
    const count = await this.invalidationService.invalidateByTag(tag);
    return { success: true, invalidatedKeys: count };
  }

  @Post('invalidate/pattern')
  async invalidateByPattern(@Body('pattern') pattern: string) {
    const count = await this.invalidationService.invalidatePattern(pattern);
    return { success: true, invalidatedKeys: count };
  }

  @Post('warmup')
  async triggerWarmup() {
    await this.warmupService.warmupCriticalData();
    return { success: true, message: 'Cache warmup triggered' };
  }

  @Post('warmup/keys')
  async warmupKeys(@Body('keys') keys: string[]) {
    await this.warmupService.warmupKeys(keys);
    return { success: true, message: `Warmed up ${keys.length} keys` };
  }

  @Post('warmup/pattern')
  async addWarmupPattern(@Body('pattern') pattern: string) {
    await this.warmupService.addWarmupPattern(pattern);
    return { success: true, message: `Added warmup pattern: ${pattern}` };
  }

  @Get('warmup/patterns')
  async getWarmupPatterns() {
    return this.warmupService.getWarmupPatterns();
  }

  @Post('preload')
  async preloadKey(@Body('key') key: string) {
    await this.predictiveService.preload(key);
    return { success: true, message: `Preloaded key: ${key}` };
  }

  @Post('analyze')
  async analyzePatterns() {
    await this.predictiveService.analyzePatterns();
    return { success: true, message: 'Access pattern analysis triggered' };
  }

  @Get('analyze/top')
  async getTopPatterns(@Body('limit') limit?: number) {
    return this.predictiveService.getTopPatterns(limit);
  }

  @Get('health')
  async healthCheck() {
    return this.cacheService.healthCheck();
  }

  @Get('size')
  async getSize() {
    return this.cacheService.getSize();
  }

  @Get('top-keys')
  async getTopKeys(@Body('limit') limit?: number) {
    return this.monitoringService.getTopKeys(limit);
  }

  @Get('memory')
  async getMemoryUsage() {
    return this.monitoringService.getMemoryUsage();
  }

  @Get('latency')
  async getLatencyMetrics() {
    return this.monitoringService.getLatencyMetrics();
  }

  @Get('evictions')
  async getEvictionRate() {
    return this.monitoringService.getEvictionRate();
  }

  @Post('clear')
  async clearCache() {
    await this.cacheService.clear();
    return { success: true, message: 'Cache cleared' };
  }

  @Post('reset-metrics')
  async resetMetrics() {
    this.monitoringService.resetMetrics();
    return { success: true, message: 'Metrics reset' };
  }

  @Get('key/generate')
  async generateKey(@Body() body: { parts: string[] }) {
    return { key: this.keyStrategy.generateKey(...body.parts) };
  }

  @Get('key/parse')
  async parseKey(@Body('key') key: string) {
    return this.keyStrategy.parseKey(key);
  }
}
