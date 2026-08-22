import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { AnalyticsMetric } from './entities/analytics-metric.entity';
import { AnomalyAlert, AnomalySeverity, AnomalyStatus, AnomalyType } from './entities/anomaly-alert.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

interface AnomalyThreshold {
  metricName: string;
  threshold: number; // percentage deviation
  minAbsoluteValue?: number;
  severity: AnomalySeverity;
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  private readonly thresholds: AnomalyThreshold[] = [
    { metricName: 'revenue', threshold: 30, minAbsoluteValue: 1000, severity: AnomalySeverity.HIGH },
    { metricName: 'transaction_volume', threshold: 40, minAbsoluteValue: 100, severity: AnomalySeverity.MEDIUM },
    { metricName: 'success_rate', threshold: 15, severity: AnomalySeverity.HIGH },
    { metricName: 'avg_order_value', threshold: 25, minAbsoluteValue: 50, severity: AnomalySeverity.MEDIUM },
  ];

  constructor(
    @InjectRepository(AnalyticsMetric)
    private metricsRepository: Repository<AnalyticsMetric>,
    @InjectRepository(AnomalyAlert)
    private alertsRepository: Repository<AnomalyAlert>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async detectAnomalies() {
    this.logger.log('Running anomaly detection...');
    
    try {
      const merchants = await this.getActiveMerchants();
      
      for (const merchantId of merchants) {
        await this.detectAnomaliesForMerchant(merchantId);
      }
      
      this.logger.log(`Anomaly detection completed for ${merchants.length} merchants`);
    } catch (error) {
      this.logger.error(`Anomaly detection failed: ${error.message}`);
    }
  }

  private async getActiveMerchants(): Promise<string[]> {
    const result = await this.metricsRepository
      .createQueryBuilder('metric')
      .select('DISTINCT metric.merchantId', 'merchantId')
      .where('metric.timestamp >= :date', { date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getRawMany();
    
    return result.map(r => r.merchantId);
  }

  async detectAnomaliesForMerchant(merchantId: string): Promise<AnomalyAlert[]> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const detectedAnomalies: AnomalyAlert[] = [];

    for (const threshold of this.thresholds) {
      const currentMetrics = await this.metricsRepository.find({
        where: {
          merchantId,
          metricName: threshold.metricName,
          timestamp: Between(yesterday, now),
        },
      });

      const historicalMetrics = await this.metricsRepository.find({
        where: {
          merchantId,
          metricName: threshold.metricName,
          timestamp: Between(lastWeek, yesterday),
        },
      });

      if (currentMetrics.length === 0 || historicalMetrics.length === 0) {
        continue;
      }

      const currentValue = currentMetrics.reduce((sum, m) => sum + Number(m.metricValue), 0);
      const historicalAverage = historicalMetrics.reduce((sum, m) => sum + Number(m.metricValue), 0) / historicalMetrics.length;

      if (threshold.minAbsoluteValue && currentValue < threshold.minAbsoluteValue) {
        continue;
      }

      const deviation = ((currentValue - historicalAverage) / historicalAverage) * 100;

      if (Math.abs(deviation) >= threshold.threshold) {
        const anomaly = await this.createAnomalyAlert(
          merchantId,
          threshold.metricName,
          currentValue,
          historicalAverage,
          deviation,
          threshold,
        );
        
        if (anomaly) {
          detectedAnomalies.push(anomaly);
        }
      }
    }

    return detectedAnomalies;
  }

  private async createAnomalyAlert(
    merchantId: string,
    metricName: string,
    actualValue: number,
    expectedValue: number,
    deviation: number,
    threshold: AnomalyThreshold,
  ): Promise<AnomalyAlert | null> {
    // Check if similar alert already exists in the last hour
    const recentAlert = await this.alertsRepository.findOne({
      where: {
        merchantId,
        type: this.getAnomalyType(metricName, deviation),
        status: AnomalyStatus.OPEN,
        createdAt: MoreThanOrEqual(new Date(Date.now() - 60 * 60 * 1000)),
      },
    });

    if (recentAlert) {
      return null;
    }

    const anomalyType = this.getAnomalyType(metricName, deviation);
    const description = this.generateDescription(metricName, deviation, actualValue, expectedValue);

    const alert = this.alertsRepository.create({
      merchantId,
      type: anomalyType,
      severity: threshold.severity,
      status: AnomalyStatus.OPEN,
      description,
      metadata: {
        metricName,
        expectedValue,
        actualValue,
        deviation,
        threshold: threshold.threshold,
        timestamp: new Date().toISOString(),
      },
    });

    const saved = await this.alertsRepository.save(alert);
    this.logger.log(`Anomaly detected for merchant ${merchantId}: ${description}`);
    
    // TODO: Send notification via notification service
    
    return saved;
  }

  private getAnomalyType(metricName: string, deviation: number): AnomalyType {
    if (metricName === 'revenue') {
      return deviation > 0 ? AnomalyType.REVENUE_SPIKE : AnomalyType.REVENUE_DROP;
    }
    if (metricName === 'success_rate') {
      return AnomalyType.SUCCESS_RATE_DROP;
    }
    if (metricName === 'transaction_volume') {
      return AnomalyType.UNUSUAL_VOLUME;
    }
    return AnomalyType.UNUSUAL_VOLUME;
  }

  private generateDescription(
    metricName: string,
    deviation: number,
    actualValue: number,
    expectedValue: number,
  ): string {
    const direction = deviation > 0 ? 'increase' : 'decrease';
    const formattedMetric = metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return `${formattedMetric} ${direction} of ${Math.abs(deviation).toFixed(1)}% detected. ` +
           `Current: ${actualValue.toFixed(2)}, Expected: ${expectedValue.toFixed(2)}`;
  }

  async getAlerts(
    merchantId: string,
    status?: AnomalyStatus,
    severity?: AnomalySeverity,
    limit: number = 50,
  ): Promise<AnomalyAlert[]> {
    const where: any = { merchantId };
    
    if (status) {
      where.status = status;
    }
    if (severity) {
      where.severity = severity;
    }

    return this.alertsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<AnomalyAlert> {
    const alert = await this.alertsRepository.findOne({ where: { id: alertId } });
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = AnomalyStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    return this.alertsRepository.save(alert);
  }

  async resolveAlert(alertId: string, notes: string): Promise<AnomalyAlert> {
    const alert = await this.alertsRepository.findOne({ where: { id: alertId } });
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = AnomalyStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolutionNotes = notes;

    return this.alertsRepository.save(alert);
  }

  async markAsFalsePositive(alertId: string): Promise<AnomalyAlert> {
    const alert = await this.alertsRepository.findOne({ where: { id: alertId } });
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = AnomalyStatus.FALSE_POSITIVE;
    alert.resolvedAt = new Date();

    return this.alertsRepository.save(alert);
  }

  async getAnomalyStats(merchantId: string): Promise<{
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<AnomalySeverity, number>;
    byType: Record<AnomalyType, number>;
  }> {
    const alerts = await this.alertsRepository.find({
      where: { merchantId },
    });

    const stats = {
      total: alerts.length,
      open: 0,
      acknowledged: 0,
      resolved: 0,
      bySeverity: {} as Record<AnomalySeverity, number>,
      byType: {} as Record<AnomalyType, number>,
    };

    for (const alert of alerts) {
      if (alert.status === AnomalyStatus.OPEN) stats.open++;
      if (alert.status === AnomalyStatus.ACKNOWLEDGED) stats.acknowledged++;
      if (alert.status === AnomalyStatus.RESOLVED || alert.status === AnomalyStatus.FALSE_POSITIVE) {
        stats.resolved++;
      }

      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    }

    return stats;
  }
}
