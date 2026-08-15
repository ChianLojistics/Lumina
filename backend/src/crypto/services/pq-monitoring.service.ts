import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PQKeyManagementService } from './pq-key-management.service';
import { CryptoAgilityService } from './crypto-agility.service';
import { PQBenchmarkService } from './pq-benchmark.service';
import { PQMigrationService } from './pq-migration.service';

export interface PQCHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  metrics: {
    totalKeys: number;
    activeKeys: number;
    deprecatedKeys: number;
    revokedKeys: number;
    quantumResistantEnabled: boolean;
    hybridModeEnabled: boolean;
    averageOperationLatency: number;
    errorRate: number;
  };
  alerts: PQCAlert[];
}

export interface PQCAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface PQCPerformanceMetrics {
  algorithm: string;
  operation: string;
  p50: number;
  p95: number;
  p99: number;
  average: number;
  min: number;
  max: number;
  throughput: number;
  errorRate: number;
  timestamp: Date;
}

@Injectable()
export class PQMonitoringService {
  private readonly logger = new Logger(PQMonitoringService.name);
  private alerts: PQCAlert[] = [];
  private performanceHistory: PQCPerformanceMetrics[] = [];
  private operationErrors: Map<string, number> = new Map();
  private operationCount: Map<string, number> = new Map();

  constructor(
    private readonly keyManagementService: PQKeyManagementService,
    private readonly cryptoAgilityService: CryptoAgilityService,
    private readonly benchmarkService: PQBenchmarkService,
    private readonly migrationService: PQMigrationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics(): Promise<void> {
    try {
      const keyStats = await this.keyManagementService.getKeyStatistics();
      const metrics = this.cryptoAgilityService.getMetrics();
      
      // Calculate error rate
      let totalOperations = 0;
      let totalErrors = 0;
      
      for (const [operation, count] of this.operationCount.entries()) {
        totalOperations += count;
        const errors = this.operationErrors.get(operation) || 0;
        totalErrors += errors;
      }
      
      const errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
      
      // Check for issues
      if (errorRate > 5) {
        this.createAlert('error', 'HIGH_ERROR_RATE', `Error rate is ${errorRate.toFixed(2)}%`, {
          errorRate,
          totalOperations,
          totalErrors,
        });
      }
      
      if (keyStats.revoked > keyStats.active * 0.1) {
        this.createAlert('warning', 'HIGH_REVOKED_KEY_COUNT', 
          `High number of revoked keys: ${keyStats.revoked}`, {
          revokedCount: keyStats.revoked,
          activeCount: keyStats.active,
        });
      }
      
      // Clean up old alerts
      this.cleanupOldAlerts();
      
      this.logger.debug('Metrics collected successfully');
    } catch (error: any) {
      this.logger.error(`Failed to collect metrics: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async analyzePerformance(): Promise<void> {
    try {
      const algorithms = ['ML-KEM-1024', 'ML-DSA-65', 'X25519', 'ED25519'];
      const operations = ['keygen', 'sign', 'verify', 'encrypt', 'decrypt'];
      
      for (const algorithm of algorithms) {
        for (const operation of operations) {
          const metrics = this.cryptoAgilityService.getMetrics(algorithm, operation);
          
          if (metrics.length > 0) {
            const durations = metrics.map(m => m.duration);
            const performanceMetrics: PQCPerformanceMetrics = {
              algorithm,
              operation,
              p50: this.calculatePercentile(durations, 50),
              p95: this.calculatePercentile(durations, 95),
              p99: this.calculatePercentile(durations, 99),
              average: durations.reduce((a, b) => a + b, 0) / durations.length,
              min: Math.min(...durations),
              max: Math.max(...durations),
              throughput: 1000 / (durations.reduce((a, b) => a + b, 0) / durations.length),
              errorRate: this.calculateErrorRate(algorithm, operation),
              timestamp: new Date(),
            };
            
            this.performanceHistory.push(performanceMetrics);
            
            // Keep only last 7 days of performance history
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            this.performanceHistory = this.performanceHistory.filter(
              m => m.timestamp >= weekAgo,
            );
            
            // Check for performance degradation
            await this.checkPerformanceDegradation(performanceMetrics);
          }
        }
      }
      
      this.logger.debug('Performance analysis completed');
    } catch (error: any) {
      this.logger.error(`Failed to analyze performance: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runHealthCheck(): Promise<PQCHealthStatus> {
    try {
      const keyStats = await this.keyManagementService.getKeyStatistics();
      const migrationStatus = await this.migrationService.checkMigrationStatus();
      const recentMetrics = this.performanceHistory.slice(-10);
      
      const averageLatency = recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.average, 0) / recentMetrics.length
        : 0;
      
      const errorRate = this.calculateOverallErrorRate();
      
      // Determine overall health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (errorRate > 10 || !migrationStatus.ready) {
        status = 'unhealthy';
      } else if (errorRate > 5 || averageLatency > 1000) {
        status = 'degraded';
      }
      
      const healthStatus: PQCHealthStatus = {
        status,
        timestamp: new Date(),
        metrics: {
          totalKeys: keyStats.total,
          activeKeys: keyStats.active,
          deprecatedKeys: keyStats.deprecated,
          revokedKeys: keyStats.revoked,
          quantumResistantEnabled: migrationStatus.quantumResistanceRequired,
          hybridModeEnabled: migrationStatus.hybridModeEnabled,
          averageOperationLatency: averageLatency,
          errorRate,
        },
        alerts: this.getActiveAlerts(),
      };
      
      this.logger.log(`Health check completed: ${status}`);
      return healthStatus;
    } catch (error: any) {
      this.logger.error(`Health check failed: ${error.message}`);
      
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        metrics: {
          totalKeys: 0,
          activeKeys: 0,
          deprecatedKeys: 0,
          revokedKeys: 0,
          quantumResistantEnabled: false,
          hybridModeEnabled: false,
          averageOperationLatency: 0,
          errorRate: 100,
        },
        alerts: [{
          id: randomUUID(),
          severity: 'critical',
          type: 'HEALTH_CHECK_FAILED',
          message: `Health check failed: ${error.message}`,
          timestamp: new Date(),
          resolved: false,
        }],
      };
    }
  }

  recordOperation(operation: string, success: boolean, duration: number): void {
    const key = `${operation}`;
    this.operationCount.set(key, (this.operationCount.get(key) || 0) + 1);
    
    if (!success) {
      this.operationErrors.set(key, (this.operationErrors.get(key) || 0) + 1);
    }
  }

  createAlert(
    severity: 'info' | 'warning' | 'error' | 'critical',
    type: string,
    message: string,
    metadata?: Record<string, any>,
  ): void {
    const alert: PQCAlert = {
      id: randomUUID(),
      severity,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata,
    };
    
    this.alerts.push(alert);
    
    // Log critical alerts immediately
    if (severity === 'critical' || severity === 'error') {
      this.logger.error(`[${type}] ${message}`, metadata);
    } else if (severity === 'warning') {
      this.logger.warn(`[${type}] ${message}`, metadata);
    } else {
      this.logger.log(`[${type}] ${message}`, metadata);
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.log(`Alert resolved: ${alert.type}`);
    }
  }

  getActiveAlerts(): PQCAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  getAllAlerts(): PQCAlert[] {
    return [...this.alerts];
  }

  getPerformanceMetrics(
    algorithm?: string,
    operation?: string,
    hours: number = 24,
  ): PQCPerformanceMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.performanceHistory.filter(m => {
      if (m.timestamp < cutoff) return false;
      if (algorithm && m.algorithm !== algorithm) return false;
      if (operation && m.operation !== operation) return false;
      return true;
    });
  }

  getPerformanceTrend(
    algorithm: string,
    operation: string,
    hours: number = 24,
  ): {
    current: PQCPerformanceMetrics | null;
    previous: PQCPerformanceMetrics | null;
    trend: 'improving' | 'degrading' | 'stable';
    changePercent: number;
  } {
    const metrics = this.getPerformanceMetrics(algorithm, operation, hours);
    
    if (metrics.length < 2) {
      return {
        current: metrics[metrics.length - 1] || null,
        previous: null,
        trend: 'stable',
        changePercent: 0,
      };
    }
    
    const current = metrics[metrics.length - 1];
    const previous = metrics[0];
    
    const changePercent = previous.average > 0
      ? ((previous.average - current.average) / previous.average) * 100
      : 0;
    
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (changePercent > 10) {
      trend = 'improving';
    } else if (changePercent < -10) {
      trend = 'degrading';
    }
    
    return { current, previous, trend, changePercent };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateErrorRate(algorithm: string, operation: string): number {
    const key = `${operation}`;
    const errors = this.operationErrors.get(key) || 0;
    const total = this.operationCount.get(key) || 0;
    
    return total > 0 ? (errors / total) * 100 : 0;
  }

  private calculateOverallErrorRate(): number {
    let totalErrors = 0;
    let totalOperations = 0;
    
    for (const [operation, errors] of this.operationErrors.entries()) {
      totalErrors += errors;
      totalOperations += this.operationCount.get(operation) || 0;
    }
    
    return totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
  }

  private async checkPerformanceDegradation(metrics: PQCPerformanceMetrics): Promise<void> {
    const trend = this.getPerformanceTrend(metrics.algorithm, metrics.operation, 24);
    
    if (trend.trend === 'degrading' && Math.abs(trend.changePercent) > 25) {
      this.createAlert('warning', 'PERFORMANCE_DEGRADATION',
        `${metrics.algorithm} ${metrics.operation} performance degraded by ${Math.abs(trend.changePercent).toFixed(2)}%`,
        {
          algorithm: metrics.algorithm,
          operation: metrics.operation,
          changePercent: trend.changePercent,
          currentAverage: metrics.average,
          previousAverage: trend.previous?.average,
        },
      );
    }
    
    if (metrics.p99 > 5000) {
      this.createAlert('warning', 'HIGH_LATENCY',
        `${metrics.algorithm} ${metrics.operation} P99 latency is ${metrics.p99}ms`,
        {
          algorithm: metrics.algorithm,
          operation: metrics.operation,
          p99: metrics.p99,
        },
      );
    }
  }

  private cleanupOldAlerts(): void {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => {
      if (a.timestamp < weekAgo && a.resolved) {
        return false;
      }
      return true;
    });
    
    // Also clean up old operation counters
    this.operationCount.clear();
    this.operationErrors.clear();
  }

  async getMonitoringDashboard(): Promise<{
    health: PQCHealthStatus;
    performance: PQCPerformanceMetrics[];
    alerts: PQCAlert[];
    migration: any;
  }> {
    const [health, performance, migration] = await Promise.all([
      this.runHealthCheck(),
      Promise.resolve(this.getPerformanceMetrics(undefined, undefined, 24)),
      this.migrationService.checkMigrationStatus(),
    ]);
    
    return {
      health,
      performance,
      alerts: this.getActiveAlerts(),
      migration,
    };
  }
}
