import { Injectable, Logger } from '@nestjs/common';
import { RateLimitAlgorithmService } from './rate-limit-algorithm.service';

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  throttledRequests: number;
  challengedRequests: number;
  averageResponseTime: number;
  currentSystemLoad: number;
  redisAvailable: boolean;
  activePolicies: number;
}

@Injectable()
export class RateLimitMonitoringService {
  private readonly logger = new Logger(RateLimitMonitoringService.name);
  private metrics = {
    totalRequests: 0,
    allowedRequests: 0,
    blockedRequests: 0,
    throttledRequests: 0,
    challengedRequests: 0,
    responseTimes: [] as number[],
  };
  private startTime = Date.now();

  constructor(
    private readonly algorithmService: RateLimitAlgorithmService,
  ) {}

  recordRequest(allowed: boolean, action?: string, responseTime?: number): void {
    this.metrics.totalRequests++;
    
    if (allowed) {
      this.metrics.allowedRequests++;
    } else {
      switch (action) {
        case 'block':
          this.metrics.blockedRequests++;
          break;
        case 'throttle':
          this.metrics.throttledRequests++;
          break;
        case 'challenge':
          this.metrics.challengedRequests++;
          break;
        default:
          this.metrics.blockedRequests++;
      }
    }

    if (responseTime !== undefined) {
      this.metrics.responseTimes.push(responseTime);
      if (this.metrics.responseTimes.length > 1000) {
        this.metrics.responseTimes.shift();
      }
    }
  }

  getMetrics(): RateLimitMetrics {
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      allowedRequests: this.metrics.allowedRequests,
      blockedRequests: this.metrics.blockedRequests,
      throttledRequests: this.metrics.throttledRequests,
      challengedRequests: this.metrics.challengedRequests,
      averageResponseTime: avgResponseTime,
      currentSystemLoad: 0,
      redisAvailable: this.algorithmService.isRedisAvailable(),
      activePolicies: 0,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      throttledRequests: 0,
      challengedRequests: 0,
      responseTimes: [],
    };
    this.startTime = Date.now();
    this.logger.log('Metrics reset');
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  isRedisAvailable(): boolean {
    return this.algorithmService.isRedisAvailable();
  }

  getMetricsSummary(): string {
    const metrics = this.getMetrics();
    const uptime = this.getUptime();
    const requestsPerSecond = metrics.totalRequests / (uptime / 1000);

    return `
Rate Limiting Metrics Summary:
- Total Requests: ${metrics.totalRequests}
- Allowed Requests: ${metrics.allowedRequests} (${((metrics.allowedRequests / metrics.totalRequests) * 100).toFixed(2)}%)
- Blocked Requests: ${metrics.blockedRequests} (${((metrics.blockedRequests / metrics.totalRequests) * 100).toFixed(2)}%)
- Throttled Requests: ${metrics.throttledRequests} (${((metrics.throttledRequests / metrics.totalRequests) * 100).toFixed(2)}%)
- Challenged Requests: ${metrics.challengedRequests} (${((metrics.challengedRequests / metrics.totalRequests) * 100).toFixed(2)}%)
- Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms
- Requests Per Second: ${requestsPerSecond.toFixed(2)}
- Redis Available: ${metrics.redisAvailable}
- Uptime: ${(uptime / 1000).toFixed(2)}s
    `.trim();
  }
}
