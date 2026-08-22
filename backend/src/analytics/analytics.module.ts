import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCacheService } from './analytics-cache.service';
import { AnomalyDetectionController } from './anomaly-detection.controller';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { RevenueForecast } from './entities/revenue-forecast.entity';
import { CustomerAnalytics } from './entities/customer-analytics.entity';
import { CustomReport } from './entities/custom-report.entity';
import { AnomalyAlert } from './entities/anomaly-alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsMetric,
      RevenueForecast,
      CustomerAnalytics,
      CustomReport,
      AnomalyAlert,
    ]),
  ],
  controllers: [AnalyticsController, AnomalyDetectionController],
  providers: [AnalyticsService, AnalyticsCacheService, AnomalyDetectionService],
  exports: [AnalyticsService, AnalyticsCacheService, AnomalyDetectionService],
})
export class AnalyticsModule {}
