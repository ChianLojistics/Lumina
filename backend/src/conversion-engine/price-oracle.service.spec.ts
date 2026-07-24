import { ServiceUnavailableException } from '@nestjs/common';
import { PriceOracleService } from './price-oracle.service';
import { ConversionAsset } from './asset.enum';
import { ChainlinkProvider } from './providers/chainlink.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { BinanceProvider } from './providers/binance.provider';

describe('PriceOracleService', () => {
  let chainlink: { name: string; getPriceUsd: jest.Mock };
  let coingecko: { name: string; getPriceUsd: jest.Mock };
  let binance: { name: string; getPriceUsd: jest.Mock };
  let service: PriceOracleService;

  beforeEach(() => {
    chainlink = { name: 'chainlink', getPriceUsd: jest.fn() };
    coingecko = { name: 'coingecko', getPriceUsd: jest.fn() };
    binance = { name: 'binance', getPriceUsd: jest.fn() };

    service = new PriceOracleService(
      chainlink as unknown as ChainlinkProvider,
      coingecko as unknown as CoinGeckoProvider,
      binance as unknown as BinanceProvider,
    );
  });

  it('always returns a 1:1 peg for USDC without calling any provider', async () => {
    const quote = await service.getPriceUsd(ConversionAsset.USDC);

    expect(quote).toEqual({ price: 1, source: 'peg' });
    expect(chainlink.getPriceUsd).not.toHaveBeenCalled();
  });

  it('falls back to the next provider when one fails', async () => {
    chainlink.getPriceUsd.mockRejectedValue(new Error('not configured'));
    coingecko.getPriceUsd.mockResolvedValue(65000);

    const quote = await service.getPriceUsd(ConversionAsset.BTC);

    expect(quote).toEqual({ price: 65000, source: 'coingecko' });
    expect(binance.getPriceUsd).not.toHaveBeenCalled();
  });

  it('throws when every provider fails', async () => {
    chainlink.getPriceUsd.mockRejectedValue(new Error('down'));
    coingecko.getPriceUsd.mockRejectedValue(new Error('down'));
    binance.getPriceUsd.mockRejectedValue(new Error('down'));

    await expect(service.getPriceUsd(ConversionAsset.BTC)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('caches a successful quote and does not call providers again before the TTL expires', async () => {
    chainlink.getPriceUsd.mockResolvedValue(65000);

    const first = await service.getPriceUsd(ConversionAsset.BTC);
    const second = await service.getPriceUsd(ConversionAsset.BTC);

    expect(first).toEqual({ price: 65000, source: 'chainlink' });
    expect(second).toEqual({ price: 65000, source: 'chainlink' });
    expect(chainlink.getPriceUsd).toHaveBeenCalledTimes(1);
  });
});
