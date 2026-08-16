import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { RaftConsensusService } from './raft-consensus.service';

interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  metrics: {
    totalEntries: number;
    writeLatency: number;
    readLatency: number;
    consensusStatus: boolean;
    nodeCount: number;
    storageUsage: number;
    errorRate: number;
  };
}

@Injectable()
export class LedgerHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LedgerHealthService.name);
  private healthHistory: HealthMetrics[] = [];
  private readonly MAX_HISTORY_SIZE = 1440; // 24 hours of minute-by-minute data
  private writeLatencies: number[] = [];
  private readLatencies: number[] = [];
  private errorCount = 0;
  private totalRequests = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
    private readonly raftService: RaftConsensusService,
  ) {}

  onModuleInit() {
    this.startMonitoring();
    this.logger.log('Ledger health monitoring started');
  }

  onModuleDestroy() {
    this.stopMonitoring();
    this.logger.log('Ledger health monitoring stopped');
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Collect metrics every minute
  }

  /**
   * Stop continuous monitoring
   */
  private stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect health metrics
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics() {
    const startTime = Date.now();

    try {
      const totalEntries = await this.ledgerRepository.count();
      const raftHealth = this.raftService.getClusterHealth();
      const avgWriteLatency = this.calculateAverageLatency(this.writeLatencies);
      const avgReadLatency = this.calculateAverageLatency(this.readLatencies);
      const errorRate = this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0;

      const metrics: HealthMetrics = {
        status: this.determineHealthStatus(raftHealth, errorRate, avgWriteLatency),
        timestamp: Date.now(),
        metrics: {
          totalEntries,
          writeLatency: avgWriteLatency,
          readLatency: avgReadLatency,
          consensusStatus: raftHealth.consensusReached,
          nodeCount: raftHealth.nodes,
          storageUsage: totalEntries,
          errorRate,
        },
      };

      this.addToHistory(metrics);
      this.resetLatencyBuffers();

      this.logger.debug(`Health metrics collected: ${JSON.stringify(metrics.metrics)}`);
    } catch (error) {
      this.logger.error(`Failed to collect health metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(
    raftHealth: any,
    errorRate: number,
    writeLatency: number,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Check for unhealthy conditions
    if (!raftHealth.consensusReached || errorRate > 10 || writeLatency > 1000) {
      return 'unhealthy';
    }

    // Check for degraded conditions
    if (
      raftHealth.nodes < 2 ||
      errorRate > 5 ||
      writeLatency > 500 ||
      !raftHealth.leader
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Add metrics to history
   */
  private addToHistory(metrics: HealthMetrics) {
    this.healthHistory.push(metrics);

    // Keep only recent history
    if (this.healthHistory.length > this.MAX_HISTORY_SIZE) {
      this.healthHistory.shift();
    }
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const sum = latencies.reduce((a, b) => a + b, 0);
    return sum / latencies.length;
  }

  /**
   * Reset latency buffers
   */
  private resetLatencyBuffers() {
    this.writeLatencies = [];
    this.readLatencies = [];
    this.errorCount = 0;
    this.totalRequests = 0;
  }

  /**
   * Record write latency
   */
  recordWriteLatency(latency: number) {
    this.writeLatencies.push(latency);
    this.totalRequests++;
  }

  /**
   * Record read latency
   */
  recordReadLatency(latency: number) {
    this.readLatencies.push(latency);
    this.totalRequests++;
  }

  /**
   * Record error
   */
  recordError() {
    this.errorCount++;
    this.totalRequests++;
  }

  /**
   * Get current health status
   */
  getCurrentHealth(): HealthMetrics | null {
    if (this.healthHistory.length === 0) {
      return null;
    }
    return this.healthHistory[this.healthHistory.length - 1];
  }

  /**
   * Get health history for time range
   */
  getHealthHistory(startTime?: number, endTime?: number): HealthMetrics[] {
    let history = this.healthHistory;

    if (startTime) {
      history = history.filter(m => m.timestamp >= startTime);
    }

    if (endTime) {
      history = history.filter(m => m.timestamp <= endTime);
    }

    return history;
  }

  /**
   * Get health trends
   */
  getHealthTrends() {
    if (this.healthHistory.length < 2) {
      return null;
    }

    const recent = this.healthHistory.slice(-60); // Last hour
    const older = this.healthHistory.slice(-120, -60); // Previous hour

    const recentAvgWriteLatency = this.calculateAverage(
      recent.map(m => m.metrics.writeLatency),
    );
    const olderAvgWriteLatency = this.calculateAverage(
      older.map(m => m.metrics.writeLatency),
    );

    const recentErrorRate = this.calculateAverage(
      recent.map(m => m.metrics.errorRate),
    );
    const olderErrorRate = this.calculateAverage(
      older.map(m => m.metrics.errorRate),
    );

    return {
      writeLatencyTrend: recentAvgWriteLatency - olderAvgWriteLatency,
      errorRateTrend: recentErrorRate - olderErrorRate,
      status: this.determineTrendStatus(
        recentAvgWriteLatency - olderAvgWriteLatency,
        recentErrorRate - olderErrorRate,
      ),
    };
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Determine trend status
   */
  private determineTrendStatus(
    latencyTrend: number,
    errorRateTrend: number,
  ): 'improving' | 'stable' | 'degrading' {
    if (latencyTrend > 100 || errorRateTrend > 5) {
      return 'degrading';
    }
    if (latencyTrend < -50 || errorRateTrend < -2) {
      return 'improving';
    }
    return 'stable';
  }

  /**
   * Get detailed health report
   */
  async getDetailedHealthReport() {
    const currentHealth = this.getCurrentHealth();
    const trends = this.getHealthTrends();
    const raftHealth = this.raftService.getClusterHealth();

    return {
      current: currentHealth,
      trends,
      raft: raftHealth,
      history: this.getHealthHistory(Date.now() - 3600000), // Last hour
      uptime: this.calculateUptime(),
    };
  }

  /**
   * Calculate service uptime
   */
  private calculateUptime(): number {
    if (this.healthHistory.length === 0) return 0;
    
    const startTime = this.healthHistory[0].timestamp;
    const currentTime = Date.now();
    return Math.floor((currentTime - startTime) / 1000); // Seconds
  }

  /**
   * Check if health is critical
   */
  isHealthCritical(): boolean {
    const current = this.getCurrentHealth();
    return current?.status === 'unhealthy' || false;
  }

  /**
   * Get alerting thresholds
   */
  getAlertThresholds() {
    return {
      writeLatencyWarning: 500,
      writeLatencyCritical: 1000,
      readLatencyWarning: 250,
      readLatencyCritical: 500,
      errorRateWarning: 5,
      errorRateCritical: 10,
      minNodes: 2,
    };
  }

  /**
   * Validate health against thresholds
   */
  validateAgainstThresholds(metrics: HealthMetrics): {
    warnings: string[];
    criticals: string[];
  } {
    const thresholds = this.getAlertThresholds();
    const warnings: string[] = [];
    const criticals: string[] = [];

    if (metrics.metrics.writeLatency > thresholds.writeLatencyCritical) {
      criticals.push(`Write latency critical: ${metrics.metrics.writeLatency}ms`);
    } else if (metrics.metrics.writeLatency > thresholds.writeLatencyWarning) {
      warnings.push(`Write latency warning: ${metrics.metrics.writeLatency}ms`);
    }

    if (metrics.metrics.readLatency > thresholds.readLatencyCritical) {
      criticals.push(`Read latency critical: ${metrics.metrics.readLatency}ms`);
    } else if (metrics.metrics.readLatency > thresholds.readLatencyWarning) {
      warnings.push(`Read latency warning: ${metrics.metrics.readLatency}ms`);
    }

    if (metrics.metrics.errorRate > thresholds.errorRateCritical) {
      criticals.push(`Error rate critical: ${metrics.metrics.errorRate}%`);
    } else if (metrics.metrics.errorRate > thresholds.errorRateWarning) {
      warnings.push(`Error rate warning: ${metrics.metrics.errorRate}%`);
    }

    if (metrics.metrics.nodeCount < thresholds.minNodes) {
      warnings.push(`Node count below minimum: ${metrics.metrics.nodeCount}`);
    }

    return { warnings, criticals };
  }
}
