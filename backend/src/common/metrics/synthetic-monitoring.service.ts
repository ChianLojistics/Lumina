import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MetricsService } from './metrics.service';
import { SlaMonitoringService } from './sla-monitoring.service';

interface ProbeDefinition {
    name: string;
    endpoint: string;
    expectedStatus: number;
    timeoutMs: number;
}

const PROBES: ProbeDefinition[] = [
    { name: 'health', endpoint: '/health', expectedStatus: 200, timeoutMs: 5000 },
    { name: 'metrics', endpoint: '/metrics', expectedStatus: 200, timeoutMs: 5000 },
    { name: 'api-docs', endpoint: '/api', expectedStatus: 200, timeoutMs: 5000 },
];

/**
 * Synthetic monitoring: periodically hits internal endpoints from within the
 * service to verify they respond correctly. Results flow into Prometheus and
 * feed the SLA error budget tracker.
 */
@Injectable()
export class SyntheticMonitoringService {
    private readonly logger = new Logger(SyntheticMonitoringService.name);
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly metricsService: MetricsService,
        private readonly slaMonitoringService: SlaMonitoringService,
    ) {
        const port = process.env.PORT || 4000;
        this.baseUrl = `http://localhost:${port}`;
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async runProbes(): Promise<void> {
        await Promise.allSettled(PROBES.map((probe) => this.runProbe(probe)));
    }

    private async runProbe(probe: ProbeDefinition): Promise<void> {
        const url = `${this.baseUrl}${probe.endpoint}`;
        const end = this.metricsService.syntheticProbeDuration.startTimer({
            probe: probe.name,
            endpoint: probe.endpoint,
        });

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, { timeout: probe.timeoutMs }),
            );
            const durationSeconds = end({ probe: probe.name, endpoint: probe.endpoint });

            const success = response.status === probe.expectedStatus;
            const statusLabel = success ? 'success' : 'unexpected_status';

            this.metricsService.syntheticProbeSuccess.set(
                { probe: probe.name, endpoint: probe.endpoint },
                success ? 1 : 0,
            );
            this.metricsService.syntheticProbeTotal.inc({
                probe: probe.name,
                endpoint: probe.endpoint,
                status: statusLabel,
            });

            if (!success) {
                this.logger.warn(
                    `Synthetic probe [${probe.name}] got status ${response.status}, expected ${probe.expectedStatus}`,
                );
                this.slaMonitoringService.recordViolation('api-availability', 'availability');
            }

            this.logger.debug(
                `Synthetic probe [${probe.name}] ${statusLabel} in ${(durationSeconds * 1000).toFixed(0)}ms`,
            );
        } catch (error: any) {
            end({ probe: probe.name, endpoint: probe.endpoint });
            this.metricsService.syntheticProbeSuccess.set(
                { probe: probe.name, endpoint: probe.endpoint },
                0,
            );
            this.metricsService.syntheticProbeTotal.inc({
                probe: probe.name,
                endpoint: probe.endpoint,
                status: 'error',
            });
            this.slaMonitoringService.recordViolation('api-availability', 'availability');
            this.logger.warn(`Synthetic probe [${probe.name}] failed: ${error?.message}`);
        }
    }
}
