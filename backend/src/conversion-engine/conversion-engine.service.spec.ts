import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentException } from '../common/exceptions';
import { ConversionEngineService } from './conversion-engine.service';
import { PriceOracleService } from './price-oracle.service';
import { ConversionAsset } from './asset.enum';
import { Conversion, ConversionStatus } from './entities/conversion.entity';
import { Payment } from '../payment/entities/payment.entity';

describe('ConversionEngineService', () => {
  let service: ConversionEngineService;
  let priceOracle: { getPriceUsd: jest.Mock };
  let conversionRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let paymentRepository: { findOne: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    priceOracle = { getPriceUsd: jest.fn() };
    conversionRepository = {
      create: jest.fn((data) => ({ attempts: 0, max_attempts: 3, ...data })),
      save: jest.fn(async (entity) => entity),
      find: jest.fn(),
    };
    paymentRepository = { findOne: jest.fn(), update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversionEngineService,
        { provide: PriceOracleService, useValue: priceOracle },
        { provide: getRepositoryToken(Conversion), useValue: conversionRepository },
        { provide: getRepositoryToken(Payment), useValue: paymentRepository },
      ],
    }).compile();

    service = module.get<ConversionEngineService>(ConversionEngineService);
  });

  describe('getConversionRate', () => {
    it('returns rate 1 for identical assets without calling the oracle', async () => {
      const result = await service.getConversionRate(ConversionAsset.USDC, ConversionAsset.USDC);

      expect(result).toEqual({ rate: 1, source: 'identity' });
      expect(priceOracle.getPriceUsd).not.toHaveBeenCalled();
    });

    it('derives the rate from both assets USD prices', async () => {
      priceOracle.getPriceUsd.mockImplementation(async (asset: ConversionAsset) => {
        if (asset === ConversionAsset.BTC) return { price: 65000, source: 'chainlink' };
        return { price: 1, source: 'peg' };
      });

      const result = await service.getConversionRate(ConversionAsset.BTC, ConversionAsset.USDC);

      expect(result).toEqual({ rate: 65000, source: 'chainlink/peg' });
    });
  });

  describe('convertAmount', () => {
    it('multiplies the amount by the conversion rate', async () => {
      priceOracle.getPriceUsd.mockImplementation(async (asset: ConversionAsset) => {
        if (asset === ConversionAsset.BTC) return { price: 65000, source: 'chainlink' };
        return { price: 1, source: 'peg' };
      });

      const result = await service.convertAmount(0.5, ConversionAsset.BTC, ConversionAsset.USDC);

      expect(result.convertedAmount).toBe(32500);
    });
  });

  describe('estimateFee', () => {
    it('applies the configured fee in basis points', async () => {
      priceOracle.getPriceUsd.mockImplementation(async (asset: ConversionAsset) => {
        if (asset === ConversionAsset.BTC) return { price: 100, source: 'chainlink' };
        return { price: 1, source: 'peg' };
      });

      const result = await service.estimateFee(ConversionAsset.BTC, ConversionAsset.USDC, 10);

      expect(result.feeBps).toBe(50);
      expect(result.feeAmount).toBe(0.05);
      expect(result.grossConvertedAmount).toBe(1000);
      expect(result.netConvertedAmount).toBeCloseTo((10 - 0.05) * 100);
    });
  });

  describe('executeConversion', () => {
    it('throws PaymentException when the payment does not exist', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.executeConversion('missing', ConversionAsset.BTC, ConversionAsset.USDC),
      ).rejects.toThrow(PaymentException);
    });

    it('marks the conversion completed and updates the payment on success', async () => {
      paymentRepository.findOne.mockResolvedValue({ id: 'payment-uuid', amount: 0.5 });
      priceOracle.getPriceUsd.mockImplementation(async (asset: ConversionAsset) => {
        if (asset === ConversionAsset.BTC) return { price: 65000, source: 'chainlink' };
        return { price: 1, source: 'peg' };
      });

      const conversion = await service.executeConversion(
        'pay_1',
        ConversionAsset.BTC,
        ConversionAsset.USDC,
      );

      expect(conversion.status).toBe(ConversionStatus.COMPLETED);
      expect(conversion.attempts).toBe(1);
      expect(paymentRepository.update).toHaveBeenCalledWith(
        'payment-uuid',
        expect.objectContaining({ conversion_rate: 65000 }),
      );
    });

    it('schedules a retry when the price oracle fails', async () => {
      paymentRepository.findOne.mockResolvedValue({ id: 'payment-uuid', amount: 0.5 });
      priceOracle.getPriceUsd.mockRejectedValue(new Error('all providers down'));

      const conversion = await service.executeConversion(
        'pay_1',
        ConversionAsset.BTC,
        ConversionAsset.USDC,
      );

      expect(conversion.status).toBe(ConversionStatus.RETRYING);
      expect(conversion.next_retry_at).not.toBeNull();
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('marks the conversion failed once max attempts are exhausted', async () => {
      paymentRepository.findOne.mockResolvedValue({ id: 'payment-uuid', amount: 0.5 });
      priceOracle.getPriceUsd.mockRejectedValue(new Error('all providers down'));
      conversionRepository.create.mockImplementation((data) => ({
        attempts: 2,
        max_attempts: 3,
        ...data,
      }));

      const conversion = await service.executeConversion(
        'pay_1',
        ConversionAsset.BTC,
        ConversionAsset.USDC,
      );

      expect(conversion.attempts).toBe(3);
      expect(conversion.status).toBe(ConversionStatus.FAILED);
      expect(conversion.next_retry_at).toBeNull();
    });
  });

  describe('getConversionStatus', () => {
    it('returns conversions for a payment ordered by most recent', async () => {
      const conversions = [{ id: 'conversion-1' }];
      conversionRepository.find.mockResolvedValue(conversions);

      const result = await service.getConversionStatus('pay_1');

      expect(conversionRepository.find).toHaveBeenCalledWith({
        where: { payment_id: 'pay_1' },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(conversions);
    });
  });
});
