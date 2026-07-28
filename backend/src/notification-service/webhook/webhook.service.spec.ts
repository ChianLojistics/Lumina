import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Webhook } from '../entities/webhook.entity';
import { WebhookDelivery, WebhookDeliveryStatus } from '../entities/webhook-delivery.entity';
import { NotificationEvent } from '../events/notification-event.enum';
import { MetricsService } from '../../common/metrics/metrics.service';

function createMetricsServiceStub(): MetricsService {
  return {
    trackExternalCall: (_service: string, _operation: string, fn: () => Promise<unknown>) => fn(),
    setQueueDepth: jest.fn(),
    recordQueueJob: jest.fn(),
  } as unknown as MetricsService;
}

describe('WebhookService', () => {
  let service: WebhookService;
  let webhookRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; remove: jest.Mock };
  let deliveryRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    webhookRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ id: 'webhook-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    deliveryRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ id: 'delivery-1', ...entity })),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: getRepositoryToken(Webhook), useValue: webhookRepository },
        { provide: getRepositoryToken(WebhookDelivery), useValue: deliveryRepository },
        { provide: MetricsService, useValue: createMetricsServiceStub() },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerWebhook', () => {
    it('creates a webhook with a generated secret', async () => {
      const result = await service.registerWebhook({
        merchant_id: 'merchant-1',
        url: 'https://example.com/hook',
        events: [NotificationEvent.PAYMENT_CONFIRMED],
      });

      expect(webhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant_id: 'merchant-1',
          url: 'https://example.com/hook',
          events: [NotificationEvent.PAYMENT_CONFIRMED],
        }),
      );
      expect(result.secret).toHaveLength(64);
    });
  });

  describe('deleteWebhook', () => {
    it('throws NotFoundException when webhook does not exist', async () => {
      webhookRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteWebhook('missing')).rejects.toThrow(NotFoundException);
    });

    it('removes the webhook when found', async () => {
      const webhook = { id: 'webhook-1' };
      webhookRepository.findOne.mockResolvedValue(webhook);

      await service.deleteWebhook('webhook-1');

      expect(webhookRepository.remove).toHaveBeenCalledWith(webhook);
    });
  });

  describe('sendWebhook', () => {
    it('only delivers to webhooks subscribed to the event', async () => {
      const subscribed = {
        id: 'webhook-1',
        merchant_id: 'merchant-1',
        url: 'https://example.com/hook',
        events: [NotificationEvent.PAYMENT_CONFIRMED],
        secret: 'secret',
        is_active: true,
      };
      const unsubscribed = {
        id: 'webhook-2',
        merchant_id: 'merchant-1',
        url: 'https://example.com/other',
        events: [NotificationEvent.PAYMENT_FAILED],
        secret: 'secret',
        is_active: true,
      };
      webhookRepository.find.mockResolvedValue([subscribed, unsubscribed]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'ok',
      }) as any;

      await service.sendWebhook(NotificationEvent.PAYMENT_CONFIRMED, 'merchant-1', {
        payment_id: 'pay_1',
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('https://example.com/hook', expect.any(Object));
    });
  });

  describe('getWebhookDeliveryStatus', () => {
    it('throws NotFoundException when webhook does not exist', async () => {
      webhookRepository.findOne.mockResolvedValue(null);

      await expect(service.getWebhookDeliveryStatus('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns deliveries ordered by most recent', async () => {
      webhookRepository.findOne.mockResolvedValue({ id: 'webhook-1' });
      const deliveries = [{ id: 'delivery-1', status: WebhookDeliveryStatus.SUCCESS }];
      deliveryRepository.find.mockResolvedValue(deliveries);

      const result = await service.getWebhookDeliveryStatus('webhook-1');

      expect(result).toEqual(deliveries);
    });
  });

  describe('verifySignature', () => {
    it('returns true for a valid signature and false for a tampered one', () => {
      const secret = 'top-secret';
      const timestamp = '1700000000000';
      const body = JSON.stringify({ event: 'payment.confirmed', data: { id: 1 } });

      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${body}`)
        .digest('hex');

      expect(WebhookService.verifySignature(body, timestamp, validSignature, secret)).toBe(true);
      expect(
        WebhookService.verifySignature(body, timestamp, 'a'.repeat(64), secret),
      ).toBe(false);
    });
  });
});
