import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookService } from './webhook.service';
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

describe('Webhook Load & Batch Processing Test', () => {
  let service: WebhookService;
  let webhookRepository: any;
  let deliveryRepository: any;
  let dlqRepository: any;

  beforeEach(async () => {
    webhookRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    deliveryRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ id: `delivery-${Math.random()}`, ...entity })),
    };
    dlqRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ id: `dlq-${Math.random()}`, ...entity })),
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
  });

  it('handles high-volume batch delivery processing efficiently', async () => {
    const webhooks = Array.from({ length: 50 }, (_, i) => ({
      id: `webhook-${i}`,
      merchant_id: 'merchant-load',
      url: `https://example.com/webhook-${i}`,
      events: [NotificationEvent.PAYMENT_CONFIRMED],
      secret: 'super-secret-key-for-load-test',
      is_active: true,
    }));

    webhookRepository.find.mockResolvedValue(webhooks);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'OK',
    }) as any;

    const events = Array.from({ length: 20 }, (_, i) => ({
      event: NotificationEvent.PAYMENT_CONFIRMED,
      merchantId: 'merchant-load',
      data: { paymentId: `pay_${i}`, amount: 100 + i, currency: 'USDC' },
    }));

    const startTime = Date.now();
    await service.sendWebhookBatch(events, 10);
    const duration = Date.now() - startTime;

    expect(fetch).toHaveBeenCalledTimes(50 * 20); // 1000 deliveries total
    expect(duration).toBeLessThan(10000); // Processed within 10s benchmark
  });
});
