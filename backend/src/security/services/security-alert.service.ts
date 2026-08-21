import { Injectable, Logger } from '@nestjs/common';
import { Vulnerability } from '../entities/vulnerability.entity';

@Injectable()
export class SecurityAlertService {
  private readonly logger = new Logger(SecurityAlertService.name);

  async notifyCriticalVulnerability(vulnerability: Vulnerability): Promise<void> {
    this.logger.error(
      `Critical vulnerability detected: ${vulnerability.id} (${vulnerability.source}) in ${vulnerability.affected_component}`,
    );

    const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical vulnerability detected: ${vulnerability.affected_component}`,
          vulnerability: {
            id: vulnerability.id,
            source: vulnerability.source,
            type: vulnerability.type,
            severity: vulnerability.severity,
            description: vulnerability.description,
            affected_component: vulnerability.affected_component,
            cve_id: vulnerability.cve_id,
          },
        }),
      });
    } catch (error) {
      this.logger.warn(`Failed to deliver security alert webhook: ${(error as Error).message}`);
    }
  }
}
