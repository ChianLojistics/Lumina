import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { Webhook } from '../entities/webhook.entity';
import { WebhookDelivery, WebhookDeliveryStatus } from '../entities/webhook-delivery.entity';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { NotificationEvent } from '../events/notification-event.enum';

const RETRY_BASE_DELAY_MS = 60 * 1000;
const RETRY_MAX_DELAY_MS = 60 * 60 * 1000;
export const SIGNATURE_HEADER = 'x-lumina-signature';
export const TIMESTAMP_HEADER = 'x-lumina-timestamp';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private deliveryRepository: Repository<WebhookDelivery>,
  ) {}

  async registerWebhook(dto: RegisterWebhookDto): Promise<Webhook> {
    const webhook = this.webhookRepository.create({
      merchant_id: dto.merchant_id,
      url: dto.url,
      events: dto.events,
      secret: crypto.randomBytes(32).toString('hex'),
    });

    return this.webhookRepository.save(webhook);
  }

  async deleteWebhook(id: string): Promise<void> {
    const webhook = await this.webhookRepository.findOne({ where: { id } });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.webhookRepository.remove(webhook);
  }

  async sendWebhook(
    event: NotificationEvent,
    merchantId: string,
    data: Record<string, any>,
  ): Promise<void> {
    const webhooks = await this.webhookRepository.find({
      where: { merchant_id: merchantId, is_active: true },
    });

    const subscribed = webhooks.filter((webhook) => webhook.events.includes(event));

    for (const webhook of subscribed) {
      const delivery = await this.deliveryRepository.save(
        this.deliveryRepository.create({
          webhook_id: webhook.id,
          event,
          payload: data,
        }),
      );

      await this.attemptDelivery(webhook, delivery);
    }
  }

  async getWebhookDeliveryStatus(webhookId: string): Promise<WebhookDelivery[]> {
    const webhook = await this.webhookRepository.findOne({ where: { id: webhookId } });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return this.deliveryRepository.find({
      where: { webhook_id: webhookId },
      order: { created_at: 'DESC' },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedDeliveries(): Promise<void> {
    const pending = await this.deliveryRepository.find({
      where: {
        status: WebhookDeliveryStatus.RETRYING,
        next_retry_at: LessThanOrEqual(new Date()),
      },
    });

    for (const delivery of pending) {
      const webhook = await this.webhookRepository.findOne({
        where: { id: delivery.webhook_id },
      });

      if (!webhook || !webhook.is_active) {
        continue;
      }

      await this.attemptDelivery(webhook, delivery);
    }
  }

  private async attemptDelivery(webhook: Webhook, delivery: WebhookDelivery): Promise<void> {
    const timestamp = Date.now().toString();
    const body = JSON.stringify({ event: delivery.event, data: delivery.payload });
    const signature = this.sign(body, timestamp, webhook.secret);

    delivery.attempts += 1;
    delivery.last_attempted_at = new Date();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [SIGNATURE_HEADER]: signature,
          [TIMESTAMP_HEADER]: timestamp,
        },
        body,
      });

      delivery.response_status = response.status;
      delivery.response_body = (await response.text()).slice(0, 1000);

      if (response.ok) {
        delivery.status = WebhookDeliveryStatus.SUCCESS;
        delivery.next_retry_at = null;
      } else {
        this.scheduleRetry(delivery, `Received status ${response.status}`);
      }
    } catch (error: any) {
      this.scheduleRetry(delivery, error.message);
    }

    await this.deliveryRepository.save(delivery);
  }

  private scheduleRetry(delivery: WebhookDelivery, errorMessage: string): void {
    delivery.error_message = errorMessage;

    if (delivery.attempts >= delivery.max_attempts) {
      delivery.status = WebhookDeliveryStatus.FAILED;
      delivery.next_retry_at = null;
      this.logger.warn(`Webhook delivery ${delivery.id} exhausted retries: ${errorMessage}`);
      return;
    }

    const delay = Math.min(
      RETRY_BASE_DELAY_MS * 2 ** (delivery.attempts - 1),
      RETRY_MAX_DELAY_MS,
    );
    delivery.status = WebhookDeliveryStatus.RETRYING;
    delivery.next_retry_at = new Date(Date.now() + delay);
  }

  private sign(body: string, timestamp: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  }

  static verifySignature(
    body: string,
    timestamp: string,
    signature: string,
    secret: string,
  ): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }
}
