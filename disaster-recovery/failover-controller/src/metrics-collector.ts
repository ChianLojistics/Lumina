export interface HealthMetrics {
  region: string;
  status: string;
  latency: number;
  timestamp: Date;
}

export class MetricsCollector {
  private healthHistory: Map<string, HealthMetrics[]> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();
  private maxHistorySize = 100;

  recordHealthCheck(region: string, result: any): void {
    const metrics: HealthMetrics = {
      region,
      status: result.status,
      latency: result.latency,
      timestamp: result.timestamp,
    };

    // Add to history
    if (!this.healthHistory.has(region)) {
      this.healthHistory.set(region, []);
    }
    
    const history = this.healthHistory.get(region)!;
    history.push(metrics);
    
    // Trim history if needed
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Update consecutive failures counter
    if (result.status === 'unhealthy') {
      this.consecutiveFailures.set(region, (this.consecutiveFailures.get(region) || 0) + 1);
    } else {
      this.consecutiveFailures.set(region, 0);
    }
  }

  getConsecutiveFailures(region: string): number {
    return this.consecutiveFailures.get(region) || 0;
  }

  getHealthHistory(region: string): HealthMetrics[] {
    return this.healthHistory.get(region) || [];
  }

  getAverageLatency(region: string): number {
    const history = this.getHealthHistory(region);
    if (history.length === 0) return 0;

    const totalLatency = history.reduce((sum, m) => sum + m.latency, 0);
    return totalLatency / history.length;
  }

  getUptimePercentage(region: string, timeWindowMinutes: number = 60): number {
    const history = this.getHealthHistory(region);
    if (history.length === 0) return 0;

    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentChecks = history.filter(m => m.timestamp >= cutoffTime);
    
    if (recentChecks.length === 0) return 0;

    const healthyChecks = recentChecks.filter(m => m.status === 'healthy').length;
    return (healthyChecks / recentChecks.length) * 100;
  }

  async getMetrics(): Promise<any> {
    const regions = ['us-east-1', 'eu-west-1'];
    const metrics: any = {};

    for (const region of regions) {
      metrics[region] = {
        consecutiveFailures: this.getConsecutiveFailures(region),
        averageLatency: this.getAverageLatency(region),
        uptimePercentage: this.getUptimePercentage(region),
        recentStatus: this.getHealthHistory(region).slice(-5),
      };
    }

    return metrics;
  }

  resetMetrics(region: string): void {
    this.healthHistory.delete(region);
    this.consecutiveFailures.delete(region);
  }

  resetAllMetrics(): void {
    this.healthHistory.clear();
    this.consecutiveFailures.clear();
  }
}
