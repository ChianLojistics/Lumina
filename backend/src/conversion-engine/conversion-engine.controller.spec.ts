import { Test, TestingModule } from '@nestjs/testing';
import { ConversionEngineController } from './conversion-engine.controller';
import { ConversionEngineService } from './conversion-engine.service';
import { ConversionAsset } from './asset.enum';

describe('ConversionEngineController', () => {
  let controller: ConversionEngineController;
  let service: {
    getConversionRate: jest.Mock;
    estimateFee: jest.Mock;
    executeConversion: jest.Mock;
    getConversionStatus: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getConversionRate: jest.fn(),
      estimateFee: jest.fn(),
      executeConversion: jest.fn(),
      getConversionStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversionEngineController],
      providers: [{ provide: ConversionEngineService, useValue: service }],
    }).compile();

    controller = module.get<ConversionEngineController>(ConversionEngineController);
  });

  it('delegates rate lookups to the service', async () => {
    service.getConversionRate.mockResolvedValue({ rate: 65000, source: 'chainlink/peg' });

    const result = await controller.getRate({ from: ConversionAsset.BTC, to: ConversionAsset.USDC });

    expect(service.getConversionRate).toHaveBeenCalledWith(ConversionAsset.BTC, ConversionAsset.USDC);
    expect(result).toEqual({ rate: 65000, source: 'chainlink/peg' });
  });

  it('parses the amount and delegates fee estimation to the service', async () => {
    service.estimateFee.mockResolvedValue({ feeAmount: 0.0025 });

    await controller.estimate({ amount: '0.5', from: ConversionAsset.BTC, to: ConversionAsset.USDC });

    expect(service.estimateFee).toHaveBeenCalledWith(ConversionAsset.BTC, ConversionAsset.USDC, 0.5);
  });

  it('delegates conversion execution to the service', async () => {
    const dto = {
      payment_id: 'pay_1',
      from_asset: ConversionAsset.BTC,
      to_asset: ConversionAsset.USDC,
    };

    await controller.execute(dto);

    expect(service.executeConversion).toHaveBeenCalledWith('pay_1', ConversionAsset.BTC, ConversionAsset.USDC);
  });

  it('delegates status lookups to the service', async () => {
    service.getConversionStatus.mockResolvedValue([]);

    const result = await controller.getStatus('pay_1');

    expect(service.getConversionStatus).toHaveBeenCalledWith('pay_1');
    expect(result).toEqual([]);
  });
});
