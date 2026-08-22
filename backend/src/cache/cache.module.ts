import { Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { L1CacheService } from './services/l1-cache.service';
import { L2CacheService } from './services/l2-cache.service';
import { L3CacheService } from './services/l3-cache.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { PredictiveCacheService } from './services/predictive-cache.service';
import { CacheWarmupService } from './services/cache-warmup.service';
import { CacheStampedeProtection } from './services/cache-stampede-protection.service';
import { CacheMonitoringService } from './services/cache-monitoring.service';
import { CacheKeyStrategy } from './strategies/cache-key.strategy';
import { CacheController } from './cache.controller';
import { MetricsModule } from '../common/metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  controllers: [CacheController],
  providers: [
    CacheService,
    L1CacheService,
    L2CacheService,
    L3CacheService,
    CacheInvalidationService,
    PredictiveCacheService,
    CacheWarmupService,
    CacheStampedeProtection,
    CacheMonitoringService,
    CacheKeyStrategy,
  ],
  exports: [
    CacheService,
    L1CacheService,
    L2CacheService,
    L3CacheService,
    CacheInvalidationService,
    PredictiveCacheService,
    CacheWarmupService,
    CacheStampedeProtection,
    CacheMonitoringService,
    CacheKeyStrategy,
  ],
})
export class CacheModule {}
