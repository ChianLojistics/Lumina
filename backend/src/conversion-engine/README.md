# Conversion Engine

Converts BTC, ETH, XLM, and USDT amounts to USDC so merchants can be paid out on Stellar
regardless of what asset the customer paid in.

## Price providers

Prices are quoted in USD and fetched with fallback across three providers, in order:

1. **Chainlink** — reads `latestRoundData()` off a Chainlink price feed contract via `eth_call`. Requires `CHAINLINK_RPC_URL` and a per-asset `CHAINLINK_<ASSET>_USD_FEED` address; skipped (falls through) if unconfigured.
2. **CoinGecko** — public `simple/price` endpoint.
3. **Binance** — public ticker endpoint, quoted against USDT (treated as a 1:1 USD peg, same as the other providers' stablecoin assumptions).

A quote is cached per asset for `PRICE_CACHE_TTL_SECONDS` (default 60s). If every provider fails, the request fails with a 503.

## API

- `GET /api/conversion/rates?from=BTC&to=USDC` — current conversion rate.
- `GET /api/conversion/estimate?amount=0.5&from=BTC&to=USDC` — converted amount plus the conversion fee (`CONVERSION_FEE_BPS`, default 50 bps).
- `POST /api/conversion/execute` — `{ payment_id, from_asset, to_asset }`, executes and persists a conversion.
- `GET /api/conversion/status/:paymentId` — conversion attempts and their status for a payment.

## Payment integration

`PaymentService.create()` calls `executeConversion` for any payment not already in USDC, and stores the result (`converted_amount`, `conversion_rate`, `conversion_fee`, `converted_at`) back onto the `Payment` row. Conversion runs asynchronously after the payment is saved, so payment creation isn't blocked on price-provider latency.

Failed conversions are retried with exponential backoff (1 minute base, capped at 1 hour, 3 attempts) by a cron job, the same pattern used by webhook delivery retries in the notification service.
