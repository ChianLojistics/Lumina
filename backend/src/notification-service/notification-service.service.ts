import { Injectable } from '@nestjs/common';
import { WebhookService } from './webhook/webhook.service';
import { EmailService } from './email/email.service';
import { RegisterWebhookDto } from './webhook/dto/register-webhook.dto';
import { UpdateWebhookDto } from './webhook/dto/update-webhook.dto';
import { TestWebhookDto } from './webhook/dto/test-webhook.dto';
import { SendEmailDto } from './email/dto/send-email.dto';
import { NotificationEvent } from './events/notification-event.enum';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookDLQ } from './entities/webhook-dlq.entity';

@Injectable()
export class NotificationServiceService {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly emailService: EmailService,
  ) {}

  registerWebhook(dto: RegisterWebhookDto): Promise<Webhook> {
    return this.webhookService.registerWebhook(dto);
  }

  updateWebhook(id: string, dto: UpdateWebhookDto): Promise<Webhook> {
    return this.webhookService.updateWebhook(id, dto);
  }

  listWebhooks(merchantId?: string): Promise<Webhook[]> {
    return this.webhookService.listWebhooks(merchantId);
  }

  getWebhook(id: string): Promise<Webhook> {
    return this.webhookService.getWebhook(id);
  }

  deleteWebhook(id: string): Promise<void> {
    return this.webhookService.deleteWebhook(id);
  }

  pauseWebhook(id: string): Promise<Webhook> {
    return this.webhookService.pauseWebhook(id);
  }

  resumeWebhook(id: string): Promise<Webhook> {
    return this.webhookService.resumeWebhook(id);
  }

  sendWebhook(
    event: NotificationEvent | string,
    merchantId: string,
    data: Record<string, any>,
  ): Promise<void> {
    return this.webhookService.sendWebhook(event, merchantId, data);
  }

  getWebhookDeliveryStatus(webhookId: string): Promise<WebhookDelivery[]> {
    return this.webhookService.getWebhookDeliveryStatus(webhookId);
  }

  replayFailedWebhooks(webhookId: string): Promise<WebhookDelivery[]> {
    return this.webhookService.replayFailedWebhooks(webhookId);
  }

  getDLQItems(merchantId?: string): Promise<WebhookDLQ[]> {
    return this.webhookService.getDLQItems(merchantId);
  }

  retryDLQItem(dlqId: string): Promise<WebhookDelivery> {
    return this.webhookService.retryDLQItem(dlqId);
  }

  testWebhook(dto: TestWebhookDto) {
    return this.webhookService.testWebhook(dto);
  }

  getWebhookStats(merchantId?: string) {
    return this.webhookService.getWebhookStats(merchantId);
  }

  sendEmail(dto: SendEmailDto) {
    return this.emailService.sendEmail(dto.merchant_id, dto.template, dto.data);
  }
}
