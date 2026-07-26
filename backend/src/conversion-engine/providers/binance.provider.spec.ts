import { BinanceProvider } from './binance.provider';
import { ConversionAsset } from '../asset.enum';

describe('BinanceProvider', () => {
  let provider: BinanceProvider;

  beforeEach(() => {
    provider = new BinanceProvider();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 1 for USDT without calling the API', async () => {
    global.fetch = jest.fn();

    const price = await provider.getPriceUsd(ConversionAsset.USDT);

    expect(price).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns the parsed ticker price for a supported asset', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ price: '3500.12' }),
    }) as any;

    const price = await provider.getPriceUsd(ConversionAsset.ETH);

    expect(price).toBe(3500.12);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('symbol=ETHUSDT'),
    );
  });

  it('throws when the response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as any;

    await expect(provider.getPriceUsd(ConversionAsset.BTC)).rejects.toThrow(
      'Binance request failed with status 503',
    );
  });
});
