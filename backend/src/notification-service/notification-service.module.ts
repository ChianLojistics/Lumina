import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { WebhookService } from './webhook/webhook.service';
import { EmailService } from './email/email.service';
import { EventFilterService } from './services/event-filter.service';
import { WebhookSignatureService } from './services/webhook-signature.service';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookDLQ } from './entities/webhook-dlq.entity';
import { Merchant } from '../payment/entities/merchant.entity';
import { MetricsModule } from '../common/metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, WebhookDelivery, WebhookDLQ, Merchant]),
    MetricsModule,
  ],
  controllers: [NotificationServiceController],
  providers: [
    NotificationServiceService,
    WebhookService,
    EmailService,
    EventFilterService,
    WebhookSignatureService,
  ],
  exports: [NotificationServiceService, WebhookService, EventFilterService, WebhookSignatureService],
})
export class NotificationServiceModule {}
