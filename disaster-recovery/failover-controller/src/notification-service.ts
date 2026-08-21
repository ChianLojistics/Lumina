import nodemailer from 'nodemailer';

export interface AlertLevel {
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
}

export class NotificationService {
  private slackWebhookUrl: string;
  private pagerDutyApiKey: string;
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.pagerDutyApiKey = process.env.PAGERDUTY_API_KEY || '';
    
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASSWORD,
      },
    });
  }

  async sendAlert(level: AlertLevel['level'], title: string, message: string): Promise<void> {
    console.log(`[${level}] ${title}: ${message}`);

    // Send to Slack
    await this.sendSlackAlert(level, title, message);
    
    // Send to PagerDuty for critical alerts
    if (level === 'CRITICAL' || level === 'ERROR') {
      await this.sendPagerDutyAlert(level, title, message);
    }
    
    // Send email for critical alerts
    if (level === 'CRITICAL') {
      await this.sendEmailAlert(level, title, message);
    }
  }

  private async sendSlackAlert(level: string, title: string, message: string): Promise<void> {
    if (!this.slackWebhookUrl) return;

    const colors = {
      INFO: '#36a64f',
      WARNING: '#ff9900',
      ERROR: '#ff0000',
      CRITICAL: '#ff0000',
    };

    try {
      await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [{
            color: colors[level] || '#36a64f',
            title: `[${level}] ${title}`,
            text: message,
            fields: [{
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true,
            }, {
              title: 'Region',
              value: process.env.PRIMARY_REGION,
              short: true,
            }],
          }],
        }),
      });
    } catch (error) {
      console.error('Error sending Slack alert:', error);
    }
  }

  private async sendPagerDutyAlert(level: string, title: string, message: string): Promise<void> {
    if (!this.pagerDutyApiKey) return;

    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: this.pagerDutyApiKey,
          event_action: 'trigger',
          payload: {
            summary: `[${level}] ${title}`,
            severity: level.toLowerCase(),
            source: 'failover-controller',
            custom_details: {
              message,
              region: process.env.PRIMARY_REGION,
              timestamp: new Date().toISOString(),
            },
          },
        }),
      });
    } catch (error) {
      console.error('Error sending PagerDuty alert:', error);
    }
  }

  private async sendEmailAlert(level: string, title: string, message: string): Promise<void> {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_SMTP_USER,
        to: 'oncall@lumina.io',
        subject: `[${level}] ${title}`,
        text: message,
        html: `
          <h2>[${level}] ${title}</h2>
          <p>${message}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Region:</strong> ${process.env.PRIMARY_REGION}</p>
        `,
      });
    } catch (error) {
      console.error('Error sending email alert:', error);
    }
  }
}
