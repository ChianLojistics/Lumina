import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const sendMailMock = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

import { EmailService } from './email.service';
import { Merchant } from '../../payment/entities/merchant.entity';
import { EmailTemplate } from './email-template.enum';

describe('EmailService', () => {
  let service: EmailService;
  let merchantRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    merchantRepository = { findOne: jest.fn() };
    sendMailMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: getRepositoryToken(Merchant), useValue: merchantRepository },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('throws NotFoundException when merchant does not exist', async () => {
    merchantRepository.findOne.mockResolvedValue(null);

    await expect(
      service.sendEmail('missing', EmailTemplate.PAYMENT_CONFIRMATION, {}),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when merchant has no email', async () => {
    merchantRepository.findOne.mockResolvedValue({ id: 'merchant-1', email: null });

    await expect(
      service.sendEmail('merchant-1', EmailTemplate.PAYMENT_CONFIRMATION, {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('sends an email built from the requested template', async () => {
    merchantRepository.findOne.mockResolvedValue({
      id: 'merchant-1',
      email: 'merchant@example.com',
    });
    sendMailMock.mockResolvedValue({ messageId: 'abc' });

    await service.sendEmail('merchant-1', EmailTemplate.PAYMENT_CONFIRMATION, {
      payment_id: 'pay_1',
      amount: 10,
      currency: 'USDC',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'merchant@example.com',
        subject: expect.stringContaining('pay_1'),
      }),
    );
  });
});
