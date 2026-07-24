import { Injectable } from '@nestjs/common';
import { ConversionAsset } from '../asset.enum';
import { PriceProvider } from './price-provider.interface';

// Binance quotes against USDT rather than USD; treated as a 1:1 USD peg, same as the
// other providers' stablecoin assumptions.
const BINANCE_SYMBOLS: Partial<Record<ConversionAsset, string>> = {
  [ConversionAsset.BTC]: 'BTCUSDT',
  [ConversionAsset.ETH]: 'ETHUSDT',
  [ConversionAsset.XLM]: 'XLMUSDT',
  [ConversionAsset.USDC]: 'USDCUSDT',
};

@Injectable()
export class BinanceProvider implements PriceProvider {
  readonly name = 'binance';

  async getPriceUsd(asset: ConversionAsset): Promise<number> {
    if (asset === ConversionAsset.USDT) {
      return 1;
    }

    const symbol = BINANCE_SYMBOLS[asset];

    if (!symbol) {
      throw new Error(`Binance does not support asset ${asset}`);
    }

    const baseUrl = process.env.BINANCE_API_URL || 'https://api.binance.com/api/v3';
    const response = await fetch(`${baseUrl}/ticker/price?symbol=${symbol}`);

    if (!response.ok) {
      throw new Error(`Binance request failed with status ${response.status}`);
    }

    const json = await response.json();
    const price = parseFloat(json?.price);

    if (Number.isNaN(price)) {
      throw new Error(`Binance returned no price for ${asset}`);
    }

    return price;
  }
}
