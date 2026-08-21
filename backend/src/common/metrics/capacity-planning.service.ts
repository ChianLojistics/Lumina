import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';

interface ResourceSample {
    timestamp: number; // epoch ms
    value: number;
}

interface ResourceDefinition {
    name: string;
    /** 0-1 value representing the "full" threshold */
    capacityLimit: number;
}

const RESOURCES: ResourceDefinition[] = [
    { name: 'db_connections', capacityLimit: 1.0 },
    { name: 'http_error_rate', capacityLimit: 0.05 },
    { name: 'queue_depth', capacityLimit: 1000 },
];

const MAX_SAMPLES = 120; // 2 hours of 1-minute samples

/**
 * Capacity planning via linear trend extrapolation.
 * Maintains a rolling 2-hour window of samples per resource, fits a linear
 * regression, and forecasts when utilization will hit the capacity limit.
 */
@Injectable()
export class CapacityPlanningService {
    private readonly logger = new Logger(CapacityPlanningService.name);
    private readonly samples = new Map<string, ResourceSample[]>();

    constructor(private readonly metricsService: MetricsService) {
        for (const r of RESOURCES) {
            this.samples.set(r.name, []);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async collect(): Promise<void> {
        const now = Date.now();

        const dbUtilization = await this.getDbUtilization();
        const httpErrorRate = await this.getHttpErrorRate();
        const queueDepth = await this.getQueueDepth();

        this.addSample('db_connections', now, dbUtilization);
        this.addSample('http_error_rate', now, httpErrorRate);
        this.addSample('queue_depth', now, queueDepth);

        for (const resource of RESOURCES) {
            const series = this.samples.get(resource.name)!;
            if (series.length < 5) continue;

            const utilization = series[series.length - 1].value / resource.capacityLimit;
            this.metricsService.capacityUtilization.set({ resource: resource.name }, Math.min(1, utilization));

            const hoursUntilLimit = this.forecastHoursUntilLimit(series, resource.capacityLimit);
            if (hoursUntilLimit !== null) {
                this.metricsService.capacityForecastHours.set({ resource: resource.name }, hoursUntilLimit);

                if (hoursUntilLimit < 24) {
                    this.logger.warn(
                        `Capacity alert: ${resource.name} forecasted to hit limit in ${hoursUntilLimit.toFixed(1)}h`,
                    );
                }
            } else {
                // Stable or decreasing — set a large positive horizon
                this.metricsService.capacityForecastHours.set({ resource: resource.name }, 8760);
            }
        }
    }

    private addSample(resource: string, timestamp: number, value: number): void {
        const series = this.samples.get(resource)!;
        series.push({ timestamp, value });
        if (series.length > MAX_SAMPLES) series.shift();
    }

    /**
     * Simple ordinary least squares linear regression over (timestamp, value) pairs.
     * Returns estimated hours until value reaches the capacity limit,
     * or null if the trend is flat/decreasing.
     */
    private forecastHoursUntilLimit(
        samples: ResourceSample[],
        limit: number,
    ): number | null {
        const n = samples.length;
        if (n < 2) return null;

        const xs = samples.map((s) => s.timestamp / 1000); // seconds
        const ys = samples.map((s) => s.value);

        const xMean = xs.reduce((a, b) => a + b, 0) / n;
        const yMean = ys.reduce((a, b) => a + b, 0) / n;

        let ssxy = 0;
        let ssxx = 0;
        for (let i = 0; i < n; i++) {
            ssxy += (xs[i] - xMean) * (ys[i] - yMean);
            ssxx += (xs[i] - xMean) ** 2;
        }

        if (ssxx === 0) return null;
        const slope = ssxy / ssxx; // value change per second

        if (slope <= 0) return null; // stable or improving

        const currentValue = ys[n - 1];
        if (currentValue >= limit) return 0;

        const secondsUntilLimit = (limit - currentValue) / slope;
        return secondsUntilLimit / 3600;
    }

    private async getDbUtilization(): Promise<number> {
        try {
            const raw = await this.metricsService.registry.getSingleMetricAsString(
                'db_pool_total_connections',
            );
            const match = raw.match(/db_pool_total_connections\s+([\d.]+)/);
            return match ? parseFloat(match[1]) : 0;
        } catch {
            return 0;
        }
    }

    private async getHttpErrorRate(): Promise<number> {
        try {
            const raw = await this.metricsService.registry.getSingleMetricAsString('http_requests_total');
            const allMatches = [...raw.matchAll(/http_requests_total\{.*\}\s+([\d.]+)/g)];
            let total = 0;
            let errors = 0;
            for (const m of allMatches) {
                const val = parseFloat(m[1]);
                total += val;
                if (m[0].includes('"5')) errors += val;
            }
            return total > 0 ? errors / total : 0;
        } catch {
            return 0;
        }
    }

    private async getQueueDepth(): Promise<number> {
        try {
            const raw = await this.metricsService.registry.getSingleMetricAsString('queue_depth');
            const matches = [...raw.matchAll(/queue_depth\{.*\}\s+([\d.]+)/g)];
            return matches.reduce((sum, m) => sum + parseFloat(m[1]), 0);
        } catch {
            return 0;
        }
    }
}
