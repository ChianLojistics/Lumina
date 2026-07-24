import { Injectable } from '@nestjs/common';
import { WebhookService } from './webhook/webhook.service';
import { EmailService } from './email/email.service';
import { RegisterWebhookDto } from './webhook/dto/register-webhook.dto';
import { SendEmailDto } from './email/dto/send-email.dto';
import { NotificationEvent } from './events/notification-event.enum';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';

@Injectable()
export class NotificationServiceService {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly emailService: EmailService,
  ) {}

  registerWebhook(dto: RegisterWebhookDto): Promise<Webhook> {
    return this.webhookService.registerWebhook(dto);
  }

  deleteWebhook(id: string): Promise<void> {
    return this.webhookService.deleteWebhook(id);
  }

  sendWebhook(
    event: NotificationEvent,
    merchantId: string,
    data: Record<string, any>,
  ): Promise<void> {
    return this.webhookService.sendWebhook(event, merchantId, data);
  }

  getWebhookDeliveryStatus(webhookId: string): Promise<WebhookDelivery[]> {
    return this.webhookService.getWebhookDeliveryStatus(webhookId);
  }

  sendEmail(dto: SendEmailDto) {
    return this.emailService.sendEmail(dto.merchant_id, dto.template, dto.data);
  }
}
