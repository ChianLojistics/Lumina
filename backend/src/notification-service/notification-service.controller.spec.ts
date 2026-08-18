import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { NotificationEvent } from './events/notification-event.enum';
import { EmailTemplate } from './email/email-template.enum';

describe('NotificationServiceController', () => {
  let controller: NotificationServiceController;
  let service: {
    registerWebhook: jest.Mock;
    updateWebhook: jest.Mock;
    listWebhooks: jest.Mock;
    getWebhook: jest.Mock;
    deleteWebhook: jest.Mock;
    pauseWebhook: jest.Mock;
    resumeWebhook: jest.Mock;
    replayFailedWebhooks: jest.Mock;
    getWebhookDeliveryStatus: jest.Mock;
    getDLQItems: jest.Mock;
    retryDLQItem: jest.Mock;
    testWebhook: jest.Mock;
    getWebhookStats: jest.Mock;
    sendEmail: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      registerWebhook: jest.fn(),
      updateWebhook: jest.fn(),
      listWebhooks: jest.fn(),
      getWebhook: jest.fn(),
      deleteWebhook: jest.fn(),
      pauseWebhook: jest.fn(),
      resumeWebhook: jest.fn(),
      replayFailedWebhooks: jest.fn(),
      getWebhookDeliveryStatus: jest.fn(),
      getDLQItems: jest.fn(),
      retryDLQItem: jest.fn(),
      testWebhook: jest.fn(),
      getWebhookStats: jest.fn(),
      sendEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationServiceController],
      providers: [{ provide: NotificationServiceService, useValue: service }],
    }).compile();

    controller = module.get<NotificationServiceController>(NotificationServiceController);
  });

  it('delegates webhook registration to the service', async () => {
    const dto = {
      merchant_id: 'merchant-1',
      url: 'https://example.com/hook',
      events: [NotificationEvent.PAYMENT_CONFIRMED],
    };
    service.registerWebhook.mockResolvedValue({ id: 'webhook-1', ...dto });

    const result = await controller.registerWebhook(dto as any);

    expect(service.registerWebhook).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'webhook-1', ...dto });
  });

  it('delegates webhook deletion to the service', async () => {
    await controller.deleteWebhook('webhook-1');

    expect(service.deleteWebhook).toHaveBeenCalledWith('webhook-1');
  });

  it('delegates delivery status lookups to the service', async () => {
    service.getWebhookDeliveryStatus.mockResolvedValue([]);

    const result = await controller.getWebhookDeliveryStatus('webhook-1');

    expect(service.getWebhookDeliveryStatus).toHaveBeenCalledWith('webhook-1');
    expect(result).toEqual([]);
  });

  it('delegates email sending to the service', async () => {
    const dto = {
      merchant_id: 'merchant-1',
      template: EmailTemplate.PAYMENT_CONFIRMATION,
      data: {},
    };

    await controller.sendEmail(dto as any);

    expect(service.sendEmail).toHaveBeenCalledWith(dto);
  });

  it('delegates pause and resume actions', async () => {
    await controller.pauseWebhook('webhook-1');
    expect(service.pauseWebhook).toHaveBeenCalledWith('webhook-1');

    await controller.resumeWebhook('webhook-1');
    expect(service.resumeWebhook).toHaveBeenCalledWith('webhook-1');
  });

  it('delegates replay, dlq and test actions', async () => {
    await controller.replayFailedWebhooks('webhook-1');
    expect(service.replayFailedWebhooks).toHaveBeenCalledWith('webhook-1');

    await controller.getDLQItems('merchant-1');
    expect(service.getDLQItems).toHaveBeenCalledWith('merchant-1');

    await controller.retryDLQItem('dlq-1');
    expect(service.retryDLQItem).toHaveBeenCalledWith('dlq-1');

    const testDto = { url: 'https://example.com/hook', secret: 'secret' };
    await controller.testWebhook(testDto as any);
    expect(service.testWebhook).toHaveBeenCalledWith(testDto);
  });
});
