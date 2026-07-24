import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { WebhookService } from './webhook/webhook.service';
import { EmailService } from './email/email.service';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { Merchant } from '../payment/entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook, WebhookDelivery, Merchant])],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService, WebhookService, EmailService],
  exports: [NotificationServiceService],
})
export class NotificationServiceModule {}
