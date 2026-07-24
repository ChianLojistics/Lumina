import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { NotificationEvent } from './events/notification-event.enum';
import { EmailTemplate } from './email/email-template.enum';

describe('NotificationServiceController', () => {
  let controller: NotificationServiceController;
  let service: {
    registerWebhook: jest.Mock;
    deleteWebhook: jest.Mock;
    getWebhookDeliveryStatus: jest.Mock;
    sendEmail: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      registerWebhook: jest.fn(),
      deleteWebhook: jest.fn(),
      getWebhookDeliveryStatus: jest.fn(),
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
});
