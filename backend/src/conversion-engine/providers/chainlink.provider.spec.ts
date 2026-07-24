import { ChainlinkProvider } from './chainlink.provider';
import { ConversionAsset } from '../asset.enum';

function encodeUint256Word(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

function encodeLatestRoundData(answer: bigint): string {
  const zero = encodeUint256Word(0n);
  const answerWord = encodeUint256Word(answer);
  return `0x${zero}${answerWord}${zero}${zero}${zero}`;
}

describe('ChainlinkProvider', () => {
  let provider: ChainlinkProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    provider = new ChainlinkProvider();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('throws when the RPC URL or feed address is not configured', async () => {
    delete process.env.CHAINLINK_RPC_URL;
    delete process.env.CHAINLINK_BTC_USD_FEED;

    await expect(provider.getPriceUsd(ConversionAsset.BTC)).rejects.toThrow(
      'Chainlink feed not configured for BTC',
    );
  });

  it('decodes the price from latestRoundData using the feed decimals', async () => {
    process.env.CHAINLINK_RPC_URL = 'https://rpc.example.com';
    process.env.CHAINLINK_BTC_USD_FEED = '0xFeedAddress';

    const answer = 6_500_000_000_000n; // 65000.00000000 at 8 decimals
    const decimals = 8n;

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: encodeLatestRoundData(answer) }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: `0x${encodeUint256Word(decimals)}` }),
      }) as any;

    const price = await provider.getPriceUsd(ConversionAsset.BTC);

    expect(price).toBe(65000);
  });
});
