import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConversionAsset } from './asset.enum';
import { PriceProvider } from './providers/price-provider.interface';
import { ChainlinkProvider } from './providers/chainlink.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { BinanceProvider } from './providers/binance.provider';

interface CacheEntry {
  price: number;
  source: string;
  expiresAt: number;
}

export interface PriceQuote {
  price: number;
  source: string;
}

@Injectable()
export class PriceOracleService {
  private readonly logger = new Logger(PriceOracleService.name);
  private readonly cache = new Map<ConversionAsset, CacheEntry>();
  private readonly providers: PriceProvider[];
  private readonly ttlMs: number;

  constructor(
    chainlink: ChainlinkProvider,
    coingecko: CoinGeckoProvider,
    binance: BinanceProvider,
  ) {
    this.providers = [chainlink, coingecko, binance];
    this.ttlMs = (parseInt(process.env.PRICE_CACHE_TTL_SECONDS || '', 10) || 60) * 1000;
  }

  async getPriceUsd(asset: ConversionAsset): Promise<PriceQuote> {
    if (asset === ConversionAsset.USDC) {
      return { price: 1, source: 'peg' };
    }

    const cached = this.cache.get(asset);
    if (cached && cached.expiresAt > Date.now()) {
      return { price: cached.price, source: cached.source };
    }

    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        const price = await provider.getPriceUsd(asset);
        this.cache.set(asset, {
          price,
          source: provider.name,
          expiresAt: Date.now() + this.ttlMs,
        });
        return { price, source: provider.name };
      } catch (error: any) {
        errors.push(`${provider.name}: ${error.message}`);
        this.logger.warn(`Price provider ${provider.name} failed for ${asset}: ${error.message}`);
      }
    }

    throw new ServiceUnavailableException(
      `All price providers failed for ${asset}: ${errors.join('; ')}`,
    );
  }
}
