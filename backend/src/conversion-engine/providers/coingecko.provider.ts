import { Injectable } from '@nestjs/common';
import { ConversionAsset } from '../asset.enum';
import { PriceProvider } from './price-provider.interface';

const COINGECKO_IDS: Record<ConversionAsset, string> = {
  [ConversionAsset.BTC]: 'bitcoin',
  [ConversionAsset.ETH]: 'ethereum',
  [ConversionAsset.XLM]: 'stellar',
  [ConversionAsset.USDT]: 'tether',
  [ConversionAsset.USDC]: 'usd-coin',
};

@Injectable()
export class CoinGeckoProvider implements PriceProvider {
  readonly name = 'coingecko';

  async getPriceUsd(asset: ConversionAsset): Promise<number> {
    const id = COINGECKO_IDS[asset];
    const baseUrl = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    const response = await fetch(`${baseUrl}/simple/price?ids=${id}&vs_currencies=usd`);

    if (!response.ok) {
      throw new Error(`CoinGecko request failed with status ${response.status}`);
    }

    const json = await response.json();
    const price = json?.[id]?.usd;

    if (typeof price !== 'number') {
      throw new Error(`CoinGecko returned no price for ${asset}`);
    }

    return price;
  }
}
