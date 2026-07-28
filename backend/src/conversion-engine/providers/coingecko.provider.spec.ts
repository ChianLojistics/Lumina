import { CoinGeckoProvider } from './coingecko.provider';
import { ConversionAsset } from '../asset.enum';
import { MetricsService } from '../../common/metrics/metrics.service';

function createMetricsServiceStub(): MetricsService {
  return {
    trackExternalCall: (_service: string, _operation: string, fn: () => Promise<unknown>) => fn(),
  } as unknown as MetricsService;
}

describe('CoinGeckoProvider', () => {
  let provider: CoinGeckoProvider;

  beforeEach(() => {
    provider = new CoinGeckoProvider(createMetricsServiceStub());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the USD price for a supported asset', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 65000 } }),
    }) as any;

    const price = await provider.getPriceUsd(ConversionAsset.BTC);

    expect(price).toBe(65000);
  });

  it('throws when the response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;

    await expect(provider.getPriceUsd(ConversionAsset.BTC)).rejects.toThrow(
      'CoinGecko request failed with status 500',
    );
  });

  it('throws when the price is missing from the response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as any;

    await expect(provider.getPriceUsd(ConversionAsset.ETH)).rejects.toThrow(
      'CoinGecko returned no price for ETH',
    );
  });
});
