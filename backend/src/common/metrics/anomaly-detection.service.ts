import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';

interface RollingWindow {
    values: number[];
    maxSize: number;
}

const WINDOW_SIZE = 60; // samples
const ANOMALY_Z_THRESHOLD = 3.0; // standard deviations
const WARNING_Z_THRESHOLD = 2.0;

/**
 * Statistical anomaly detection using a rolling Z-score approach.
 * Maintains a sliding window of observations per metric series and
 * fires anomaly gauges + counters when values deviate significantly
 * from the recent mean.
 */
@Injectable()
export class AnomalyDetectionService {
    private readonly logger = new Logger(AnomalyDetectionService.name);
    private readonly windows = new Map<string, RollingWindow>();

    constructor(private readonly metricsService: MetricsService) { }

    /**
     * Record a new observation for a named series and compute its Z-score.
     * Call this from other services whenever you have a fresh sample.
     */
    observe(metric: string, dimension: string, value: number): void {
        const key = `${metric}::${dimension}`;
        let window = this.windows.get(key);
        if (!window) {
            window = { values: [], maxSize: WINDOW_SIZE };
            this.windows.set(key, window);
        }

        window.values.push(value);
        if (window.values.length > window.maxSize) {
            window.values.shift();
        }

        if (window.values.length < 10) {
            // Not enough data yet
            return;
        }

        const zScore = this.computeZScore(window.values);
        const absZ = Math.abs(zScore);

        this.metricsService.anomalyScore.set({ metric, dimension }, absZ);

        if (absZ >= ANOMALY_Z_THRESHOLD) {
            this.metricsService.anomaliesDetectedTotal.inc({ metric, severity: 'critical' });
            this.logger.warn(
                `Anomaly detected [critical] metric=${metric} dimension=${dimension} z=${absZ.toFixed(2)} value=${value}`,
            );
        } else if (absZ >= WARNING_Z_THRESHOLD) {
            this.metricsService.anomaliesDetectedTotal.inc({ metric, severity: 'warning' });
            this.logger.debug(
                `Anomaly detected [warning] metric=${metric} dimension=${dimension} z=${absZ.toFixed(2)} value=${value}`,
            );
        }
    }

    /** Every minute, snapshot current HTTP p95 latency into anomaly detector windows. */
    @Cron(CronExpression.EVERY_MINUTE)
    async snapshotMetrics(): Promise<void> {
        try {
            const raw = await this.metricsService.registry.getSingleMetricAsString(
                'http_request_duration_seconds',
            );
            // Parse _sum and _count to derive a rough current mean latency
            const sumMatch = raw.match(/http_request_duration_seconds_sum\s+([\d.]+)/);
            const countMatch = raw.match(/http_request_duration_seconds_count\s+([\d.]+)/);
            if (sumMatch && countMatch) {
                const count = parseFloat(countMatch[1]);
                if (count > 0) {
                    const meanLatency = parseFloat(sumMatch[1]) / count;
                    this.observe('http_latency', 'overall', meanLatency);
                }
            }
        } catch {
            // metric may not have fired yet
        }

        try {
            const raw = await this.metricsService.registry.getSingleMetricAsString(
                'db_query_duration_seconds',
            );
            const sumMatch = raw.match(/db_query_duration_seconds_sum\s+([\d.]+)/);
            const countMatch = raw.match(/db_query_duration_seconds_count\s+([\d.]+)/);
            if (sumMatch && countMatch) {
                const count = parseFloat(countMatch[1]);
                if (count > 0) {
                    this.observe('db_query_latency', 'overall', parseFloat(sumMatch[1]) / count);
                }
            }
        } catch {
            // metric may not have fired yet
        }
    }

    private computeZScore(values: number[]): number {
        const n = values.length;
        const latest = values[n - 1];
        // Use all but the latest value to compute baseline
        const baseline = values.slice(0, n - 1);
        if (baseline.length === 0) return 0;

        const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
        const variance = baseline.reduce((sum, v) => sum + (v - mean) ** 2, 0) / baseline.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) return 0;
        return (latest - mean) / stdDev;
    }
}
