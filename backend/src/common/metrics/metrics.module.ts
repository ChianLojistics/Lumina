import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { DbPoolMetricsService } from './db-pool-metrics.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { SlaMonitoringService } from './sla-monitoring.service';
import { SyntheticMonitoringService } from './synthetic-monitoring.service';
import { CapacityPlanningService } from './capacity-planning.service';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    DbPoolMetricsService,
    AnomalyDetectionService,
    SlaMonitoringService,
    SyntheticMonitoringService,
    CapacityPlanningService,
  ],
  exports: [
    MetricsService,
    AnomalyDetectionService,
    SlaMonitoringService,
  ],
})
export class MetricsModule { }
