# Blockchain Listener

Polls the Stellar network for payments awaiting on-chain confirmation and keeps their status
in sync.

## How it works

Every 30 seconds (`@Cron(CronExpression.EVERY_30_SECONDS)`), `monitorTransactions()`:

1. Loads all `PENDING` payments.
2. Expires any past their `expires_at`.
3. Groups the rest by `transaction_hash` so payments sharing a hash only trigger one RPC call, and skips payments that don't have a hash yet (the customer hasn't submitted a transaction).
4. Queries each unique hash via Soroban RPC's `getTransaction`, maps `SUCCESS`/`FAILED`/`NOT_FOUND` to a confirmed, failed, or still-pending outcome, and on a terminal outcome calls `PaymentService.updateStatus()` and fires a `payment.confirmed` / `payment.failed` webhook through the notification service.

A guard flag skips a cycle entirely if the previous one is still running, so a slow RPC endpoint can't cause overlapping polls.

## Resilience

- **Retries**: each RPC call is retried up to `MAX_RETRY_ATTEMPTS` times with exponential backoff (`retry.util.ts`), bounded by `TRANSACTION_QUERY_TIMEOUT` per attempt.
- **Circuit breaker** (`circuit-breaker.ts`): opens after 5 consecutive RPC failures and stops querying for 60 seconds, then allows a single trial call before fully closing again. While open, transactions are treated as still pending and re-checked on a later cycle.
- Errors for one payment/hash never stop the rest of the cycle — they're caught and logged individually.

## Configuration

| Variable | Purpose |
|---|---|
| `STELLAR_RPC_URL` | Soroban RPC endpoint (testnet or mainnet) |
| `STELLAR_NETWORK_PASSPHRASE` | Expected network passphrase; logged as a warning on startup if it doesn't match what the RPC server reports |
| `TRANSACTION_QUERY_TIMEOUT` | Per-attempt RPC timeout in ms (default 10000) |
| `MAX_RETRY_ATTEMPTS` | Retry attempts per query before giving up for that cycle (default 3) |

## Payment integration

Depends on `PaymentModule` (for `PaymentService.updateStatus()`) and `NotificationServiceModule` (for webhook delivery), and looks up the paying merchant by `Payment.merchant_address` to route the webhook.
