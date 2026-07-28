import { Injectable } from '@nestjs/common';
import { ConversionAsset } from '../asset.enum';
import { PriceProvider } from './price-provider.interface';
import { MetricsService } from '../../common/metrics/metrics.service';

const FEED_ENV_KEYS: Record<ConversionAsset, string> = {
  [ConversionAsset.BTC]: 'CHAINLINK_BTC_USD_FEED',
  [ConversionAsset.ETH]: 'CHAINLINK_ETH_USD_FEED',
  [ConversionAsset.XLM]: 'CHAINLINK_XLM_USD_FEED',
  [ConversionAsset.USDT]: 'CHAINLINK_USDT_USD_FEED',
  [ConversionAsset.USDC]: 'CHAINLINK_USDC_USD_FEED',
};

// Standard Chainlink AggregatorV3Interface function selectors, shared by every feed contract.
const LATEST_ROUND_DATA_SELECTOR = '0xfeaf968c';
const DECIMALS_SELECTOR = '0x313ce567';

@Injectable()
export class ChainlinkProvider implements PriceProvider {
  readonly name = 'chainlink';

  constructor(private readonly metricsService: MetricsService) {}

  async getPriceUsd(asset: ConversionAsset): Promise<number> {
    const rpcUrl = process.env.CHAINLINK_RPC_URL;
    const feedAddress = process.env[FEED_ENV_KEYS[asset]];

    if (!rpcUrl || !feedAddress) {
      throw new Error(`Chainlink feed not configured for ${asset}`);
    }

    const [answerData, decimalsData] = await Promise.all([
      this.ethCall(rpcUrl, feedAddress, LATEST_ROUND_DATA_SELECTOR),
      this.ethCall(rpcUrl, feedAddress, DECIMALS_SELECTOR),
    ]);

    // latestRoundData() returns (uint80 roundId, int256 answer, uint256 startedAt,
    // uint256 updatedAt, uint80 answeredInRound). `answer` is the second 32-byte word.
    const answerHex = answerData.slice(2 + 64, 2 + 128);
    const answer = BigInt.asIntN(256, BigInt(`0x${answerHex}`));
    const decimals = Number(BigInt(decimalsData));

    return Number(answer) / 10 ** decimals;
  }

  private async ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
    return this.metricsService.trackExternalCall('chainlink', 'eth_call', async () => {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to, data }, 'latest'],
        }),
      });

      if (!response.ok) {
        throw new Error(`Chainlink RPC request failed with status ${response.status}`);
      }

      const json = await response.json();

      if (json.error) {
        throw new Error(json.error.message || 'eth_call failed');
      }

      return json.result as string;
    });
  }
}
