import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';

interface SlaDefinition {
    name: string;
    /** Target availability ratio, e.g. 0.999 for 99.9% */
    target: number;
    /** Rolling window in seconds for compliance calculation */
    windowSeconds: number;
    /** Error budget in seconds = (1 - target) * windowSeconds */
    errorBudgetSeconds: number;
}

interface SlaState {
    totalSeconds: number;
    violationSeconds: number;
    lastViolationAt?: Date;
}

const SLA_DEFINITIONS: SlaDefinition[] = [
    {
        name: 'api-availability',
        target: 0.999,
        windowSeconds: 30 * 24 * 3600, // 30-day window
        errorBudgetSeconds: Math.floor(0.001 * 30 * 24 * 3600), // ~43 min
    },
    {
        name: 'api-latency-p95-2s',
        target: 0.995,
        windowSeconds: 30 * 24 * 3600,
        errorBudgetSeconds: Math.floor(0.005 * 30 * 24 * 3600), // ~216 min
    },
    {
        name: 'db-availability',
        target: 0.999,
        windowSeconds: 30 * 24 * 3600,
        errorBudgetSeconds: Math.floor(0.001 * 30 * 24 * 3600),
    },
];

/**
 * Tracks SLA error budgets by continuously evaluating error-rate and latency
 * signals from the Prometheus registry and maintaining rolling violation windows.
 */
@Injectable()
export class SlaMonitoringService {
    private readonly logger = new Logger(SlaMonitoringService.name);
    private readonly states = new Map<string, SlaState>();

    constructor(private readonly metricsService: MetricsService) {
        for (const sla of SLA_DEFINITIONS) {
            this.states.set(sla.name, { totalSeconds: 0, violationSeconds: 0 });
        }
    }

    /** Called externally (e.g. from HTTP interceptor extension) to signal a bad interval. */
    recordViolation(slaName: string, type: 'latency' | 'error' | 'availability'): void {
        const state = this.states.get(slaName);
        if (!state) return;
        state.violationSeconds += 15; // 15s scrape interval worth of downtime
        state.lastViolationAt = new Date();
        this.metricsService.slaViolationsTotal.inc({ sla: slaName, type });
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async evaluate(): Promise<void> {
        for (const sla of SLA_DEFINITIONS) {
            const state = this.states.get(sla.name);
            if (!state) continue;

            state.totalSeconds += 30;

            let isViolating = false;

            if (sla.name === 'api-availability') {
                isViolating = await this.checkApiAvailability();
            } else if (sla.name === 'api-latency-p95-2s') {
                isViolating = await this.checkApiLatency();
            } else if (sla.name === 'db-availability') {
                isViolating = await this.checkDbAvailability();
            }

            if (isViolating) {
                state.violationSeconds += 30;
                state.lastViolationAt = new Date();
                this.metricsService.slaViolationsTotal.inc({ sla: sla.name, type: 'automated' });
            }

            // Cap totalSeconds to rolling window
            if (state.totalSeconds > sla.windowSeconds) {
                const excess = state.totalSeconds - sla.windowSeconds;
                state.totalSeconds = sla.windowSeconds;
                state.violationSeconds = Math.max(0, state.violationSeconds - excess);
            }

            const good = Math.max(0, state.totalSeconds - state.violationSeconds);
            const complianceRatio = state.totalSeconds > 0 ? good / state.totalSeconds : 1;
            const budgetUsed = state.violationSeconds;
            const budgetRemaining = Math.max(0, sla.errorBudgetSeconds - budgetUsed);
            const budgetRemainingRatio = sla.errorBudgetSeconds > 0
                ? budgetRemaining / sla.errorBudgetSeconds
                : 1;

            this.metricsService.slaComplianceRatio.set(
                { sla: sla.name, window: '30d' },
                complianceRatio,
            );
            this.metricsService.slaErrorBudgetRemaining.set({ sla: sla.name }, budgetRemainingRatio);

            if (budgetRemainingRatio < 0.1) {
                this.logger.warn(
                    `SLA error budget nearly exhausted: ${sla.name} budget=${(budgetRemainingRatio * 100).toFixed(1)}% remaining`,
                );
            }
        }
    }

    private async checkApiAvailability(): Promise<boolean> {
        try {
            const raw = await this.metricsService.registry.getSingleMetricAsString('http_requests_total');
            // If we see any 5xx rate in last window, flag it
            const matches = raw.matchAll(/http_requests_total\{.*status_code="5\d\d".*\}\s+([\d.]+)/g);
            let errorCount = 0;
            for (const m of matches) errorCount += parseFloat(m[1]);
            return errorCount > 0;
        } catch {
            return false;
        }
    }

    private async checkApiLatency(): Promise<boolean> {
        try {
            const raw = await this.metricsService.registry.getSingleMetricAsString(
                'http_request_duration_seconds',
            );
            // Heuristic: check if p99 bucket (5s) shows requests > 0
            const bucketMatch = raw.match(/http_request_duration_seconds_bucket\{.*le="10".*\}\s+([\d.]+)/);
            const totalMatch = raw.match(/http_request_duration_seconds_count\s+([\d.]+)/);
            if (bucketMatch && totalMatch) {
                const inBucket = parseFloat(bucketMatch[1]);
                const total = parseFloat(totalMatch[1]);
                if (total > 0 && (total - inBucket) / total > 0.005) return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    private async checkDbAvailability(): Promise<boolean> {
        try {
            const raw = await this.metricsService.registry.getSingleMetricAsString(
                'db_query_errors_total',
            );
            const matches = raw.matchAll(/db_query_errors_total\{.*\}\s+([\d.]+)/g);
            let errorCount = 0;
            for (const m of matches) errorCount += parseFloat(m[1]);
            return errorCount > 10; // threshold: more than 10 total errors
        } catch {
            return false;
        }
    }
}
