import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WebhookService, calculateRetryDelay, defaultRetryConfig } from './webhook.service';
import { Webhook } from '../entities/webhook.entity';
import { WebhookDelivery, WebhookDeliveryStatus } from '../entities/webhook-delivery.entity';
import { WebhookDLQ } from '../entities/webhook-dlq.entity';
import { NotificationEvent } from '../events/notification-event.enum';
import { MetricsService } from '../../common/metrics/metrics.service';
import { EventFilterService } from '../services/event-filter.service';
import { WebhookSignatureService } from '../services/webhook-signature.service';

function createMetricsServiceStub(): MetricsService {
  return {
    trackExternalCall: (_service: string, _operation: string, fn: () => Promise<unknown>) => fn(),
    setQueueDepth: jest.fn(),
    recordQueueJob: jest.fn(),
  } as unknown as MetricsService;
}

describe('WebhookService', () => {
  let service: WebhookService;
  let webhookRepository: any;
  let deliveryRepository: any;
  let dlqRepository: any;
  let eventFilterService: EventFilterService;
  let signatureService: WebhookSignatureService;

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
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };
    dlqRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ id: 'dlq-1', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        EventFilterService,
        WebhookSignatureService,
        { provide: getRepositoryToken(Webhook), useValue: webhookRepository },
        { provide: getRepositoryToken(WebhookDelivery), useValue: deliveryRepository },
        { provide: getRepositoryToken(WebhookDLQ), useValue: dlqRepository },
        { provide: MetricsService, useValue: createMetricsServiceStub() },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    eventFilterService = module.get<EventFilterService>(EventFilterService);
    signatureService = module.get<WebhookSignatureService>(WebhookSignatureService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Retry Backoff Calculation', () => {
    it('calculates exponential backoff delay correctly', () => {
      expect(calculateRetryDelay(1, defaultRetryConfig)).toBe(1000);
      expect(calculateRetryDelay(2, defaultRetryConfig)).toBe(2000);
      expect(calculateRetryDelay(3, defaultRetryConfig)).toBe(4000);
      expect(calculateRetryDelay(4, defaultRetryConfig)).toBe(8000);
      expect(calculateRetryDelay(5, defaultRetryConfig)).toBe(16000);
      expect(calculateRetryDelay(10, defaultRetryConfig)).toBe(300000); // capped at maxDelay
    });
  });

  describe('registerWebhook', () => {
    it('creates a webhook with secret and active status', async () => {
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
          is_active: true,
        }),
      );
      expect(result.secret).toHaveLength(64);
    });
  });

  describe('pauseWebhook & resumeWebhook', () => {
    it('pauses and resumes a webhook', async () => {
      const webhook = { id: 'webhook-1', is_active: true };
      webhookRepository.findOne.mockResolvedValue(webhook);

      await service.pauseWebhook('webhook-1');
      expect(webhook.is_active).toBe(false);

      await service.resumeWebhook('webhook-1');
      expect(webhook.is_active).toBe(true);
    });
  });

  describe('sendWebhook & filtering', () => {
    it('only delivers to webhooks matching filter rules', async () => {
      const activeWebhook = {
        id: 'webhook-1',
        merchant_id: 'merchant-1',
        url: 'https://example.com/hook',
        events: [NotificationEvent.PAYMENT_CONFIRMED],
        secret: 'secret',
        is_active: true,
      };
      webhookRepository.find.mockResolvedValue([activeWebhook]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'ok',
      }) as any;

      await service.sendWebhook(NotificationEvent.PAYMENT_CONFIRMED, 'merchant-1', {
        amount: 100,
      });

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('DLQ and Replay', () => {
    it('moves failed non-retryable deliveries to DLQ', async () => {
      const webhook = {
        id: 'webhook-1',
        merchant_id: 'merchant-1',
        url: 'https://example.com/hook',
        events: [NotificationEvent.PAYMENT_CONFIRMED],
        secret: 'secret',
        is_active: true,
      };
      webhookRepository.find.mockResolvedValue([webhook]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      }) as any;

      await service.sendWebhook(NotificationEvent.PAYMENT_CONFIRMED, 'merchant-1', {
        amount: 100,
      });

      expect(dlqRepository.save).toHaveBeenCalled();
    });

    it('retries DLQ item', async () => {
      const dlqItem = {
        id: 'dlq-1',
        webhook_id: 'webhook-1',
        event: 'payment.confirmed',
        payload: { amount: 100 },
      };
      const webhook = {
        id: 'webhook-1',
        url: 'https://example.com/hook',
        secret: 'secret',
        is_active: true,
      };

      dlqRepository.findOne.mockResolvedValue(dlqItem);
      webhookRepository.findOne.mockResolvedValue(webhook);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'ok',
      }) as any;

      const result = await service.retryDLQItem('dlq-1');
      expect(result).toBeDefined();
      expect(dlqRepository.remove).toHaveBeenCalledWith(dlqItem);
    });
  });

  describe('testWebhook', () => {
    it('sends test payload and returns response details', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'pong',
      }) as any;

      const result = await service.testWebhook({
        url: 'https://example.com/test',
        secret: 'test-secret',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.response_body).toBe('pong');
    });
  });

  describe('verifySignature', () => {
    it('returns true for a valid signature and false for a tampered one', () => {
      const secret = 'top-secret';
      const timestamp = String(Math.floor(Date.now() / 1000));
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
