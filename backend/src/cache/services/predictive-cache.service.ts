import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { L2CacheService } from './l2-cache.service';
import { CacheService } from './cache.service';
import { AccessPattern } from '../interfaces/cache-layer.interface';

@Injectable()
export class PredictiveCacheService {
  private readonly logger = new Logger(PredictiveCacheService.name);
  private enabled: boolean;
  private analysisInterval: number;
  private preloadThreshold: number;

  constructor(
    private readonly l2Cache: L2CacheService,
    private readonly cacheService: CacheService,
  ) {
    this.enabled = process.env.PREDICTIVE_CACHE_ENABLED === 'true';
    this.analysisInterval = parseInt(process.env.PREDICTIVE_CACHE_ANALYSIS_INTERVAL || '300000', 10); // 5 minutes
    this.preloadThreshold = parseInt(process.env.PREDICTIVE_CACHE_PRELOAD_THRESHOLD || '60000', 10); // 1 minute

    if (this.enabled) {
      this.logger.log(`Predictive cache enabled with interval: ${this.analysisInterval}ms, threshold: ${this.preloadThreshold}ms`);
    } else {
      this.logger.log('Predictive cache disabled');
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async analyzePatterns(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      this.logger.debug('Starting access pattern analysis');
      const patterns = await this.getAccessPatterns();
      
      for (const pattern of patterns) {
        const timeUntilNextAccess = pattern.predictedNextAccess - Date.now();
        
        // Preload if access is imminent
        if (timeUntilNextAccess > 0 && timeUntilNextAccess < this.preloadThreshold) {
          await this.preload(pattern.key);
          this.logger.debug(`Preloaded key: ${pattern.key} (predicted access in ${timeUntilNextAccess}ms)`);
        }
      }
      
      this.logger.debug(`Analyzed ${patterns.length} access patterns`);
    } catch (error) {
      this.logger.error(`Error analyzing access patterns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getAccessPatterns(): Promise<AccessPattern[]> {
    try {
      const data = await this.l2Cache['redis'].hgetall('cache:access:patterns');
      const patterns: AccessPattern[] = [];
      
      for (const [key, value] of Object.entries(data)) {
        try {
          const pattern: AccessPattern = JSON.parse(value as string);
          // Update prediction
          pattern.predictedNextAccess = this.predictNextAccess(pattern);
          patterns.push(pattern);
          
          // Store updated prediction
          await this.l2Cache['redis'].hset('cache:access:patterns', key, JSON.stringify(pattern));
        } catch (parseError) {
          this.logger.error(`Error parsing pattern for key ${key}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      }
      
      return patterns;
    } catch (error) {
      this.logger.error(`Error getting access patterns: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private predictNextAccess(pattern: AccessPattern): number {
    // Simple prediction based on average access interval
    // In production, this would use ML models
    const timeSinceLastAccess = Date.now() - pattern.lastAccessed;
    const predictedInterval = pattern.avgAccessInterval || timeSinceLastAccess;
    
    return pattern.lastAccessed + predictedInterval;
  }

  async preload(key: string): Promise<void> {
    try {
      // Check if already in cache
      const cached = await this.cacheService.get(key);
      if (cached !== null) {
        return;
      }
      
      // In a real implementation, this would fetch from the database
      // For now, we'll just log the preload action
      this.logger.debug(`Preloading key: ${key} (would fetch from database)`);
      
      // Example: const value = await this.database.get(key);
      // await this.cacheService.set(key, value);
    } catch (error) {
      this.logger.error(`Error preloading key ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async recordAccess(key: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const now = Date.now();
      const patternKey = `pattern:${key}`;
      const existingData = await this.l2Cache['redis'].hget('cache:access:patterns', patternKey);
      
      let pattern: AccessPattern;
      
      if (existingData) {
        pattern = JSON.parse(existingData);
        pattern.frequency++;
        pattern.lastAccessed = now;
        
        // Update average access interval
        const interval = now - (pattern.predictedNextAccess - (pattern.avgAccessInterval || 0));
        pattern.avgAccessInterval = (pattern.avgAccessInterval * (pattern.frequency - 1) + interval) / pattern.frequency;
      } else {
        pattern = {
          key,
          frequency: 1,
          lastAccessed: now,
          predictedNextAccess: now + 60000, // Default 1 minute
          avgAccessInterval: 60000,
        };
      }
      
      pattern.predictedNextAccess = this.predictNextAccess(pattern);
      
      await this.l2Cache['redis'].hset('cache:access:patterns', patternKey, JSON.stringify(pattern));
      await this.l2Cache['redis'].expire('cache:access:patterns', 86400); // 24 hours
    } catch (error) {
      this.logger.error(`Error recording access for key ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTopPatterns(limit: number = 10): Promise<AccessPattern[]> {
    try {
      const patterns = await this.getAccessPatterns();
      return patterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Error getting top patterns: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async clearPatterns(): Promise<void> {
    try {
      await this.l2Cache['redis'].del('cache:access:patterns');
      this.logger.log('Cleared all access patterns');
    } catch (error) {
      this.logger.error(`Error clearing patterns: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
