## [Infrastructure] Implement Monitoring with Prometheus and Grafana

Closes #17

### Overview

Adds a full monitoring and observability stack — metrics collection in the
backend, Prometheus scraping/alerting, and provisioned Grafana dashboards —
where none existed before.

### What's included

**Application metrics** (`backend/src/common/metrics/`)
- New `MetricsService` wrapping a `prom-client` registry, exposed at `GET /metrics`.
- `HttpMetricsInterceptor` — request rate/latency/error metrics for every route (`http_requests_total`, `http_request_duration_seconds`).
- `TypeOrmMetricsLogger` — database query duration/error metrics (`db_query_duration_seconds`, `db_query_errors_total`), wired via `TypeOrmModule.forRootAsync` with `maxQueryExecutionTime: 1` so the duration hook fires for effectively every query.
- `DbPoolMetricsService` — polls the underlying `pg` pool every 10s for `db_pool_total_connections` / `db_pool_idle_connections` / `db_pool_waiting_requests`.
- `trackExternalCall()` helper wraps outbound calls with latency + success/error counters (`external_service_call_duration_seconds`, `external_service_calls_total`), applied to: CoinGecko, Binance, and Chainlink price providers; Stellar RPC calls in the blockchain listener; Stripe calls in the ramp service; and webhook delivery.
- Queue metrics (`queue_depth`, `queue_job_processing_duration_seconds`, `queue_jobs_total`) applied to the webhook delivery retry queue — the one queue-like system in the codebase today.
- Business metrics: `payments_total` / `payment_volume_total` (payment service) and `ramp_operations_total` / `ramp_operation_volume_total` (on/off-ramp), both labeled by currency and status for success-rate dashboards.

**Prometheus** (`prometheus/`)
- `prometheus.yml` — scrape config for the backend, Prometheus/Alertmanager self-monitoring, `node-exporter` (host metrics), and `postgres-exporter`.
- 15-day retention and TSDB storage path configured via CLI flags on the `prometheus` service in `docker-compose.yml`.
- `alerts/rules.yml` — the five required alerts: `HighErrorRate` (>5% 5xx for 5m), `HighLatency` (p95 > 2s for 5m), `DatabaseConnectionPoolExhausted`, `QueueDepthThresholdExceeded`, `ServiceDown` (via Prometheus's built-in `up` metric).

**Alertmanager** (`alertmanager/`)
- Routes `severity: critical` to Slack + PagerDuty, `severity: warning` to Slack only; groups by `alertname` + `service`; inhibits latency/error-rate noise when `ServiceDown` is already firing for the same service.
- Secrets (Slack webhook, SMTP, PagerDuty routing key) are read from files under `alertmanager/secrets/` (git-ignored, `.example` templates committed) since Alertmanager doesn't expand env vars in its config.
- On-call/escalation policy documented in `alertmanager/README.md` (owned by PagerDuty's escalation policy, not this repo).

**Grafana** (`grafana/`)
- Auto-provisioned Prometheus datasource + five dashboards, no manual import needed: System Overview, API Performance, Database Performance, Queue Metrics, Business Metrics.

**docker-compose.yml**
- New services: `prometheus`, `alertmanager`, `grafana`, `node-exporter`, `postgres-exporter`, wired to the existing `backend`/`postgres` services.

### Not included / follow-ups

- **Centralized, searchable logging** (the "Logging centralized and searchable" acceptance item) is a separate concern from metrics/dashboards/alerting — the backend already emits structured JSON logs via Winston with correlation IDs, but shipping them to a searchable store (Loki, ELK) is a large enough addition that it deserves its own PR/issue rather than being bundled into "Prometheus and Grafana."
- `backend/package-lock.json` was not regenerated (no network access in this environment to run `npm install`) — run `npm install` in `backend/` after merging to lock `prom-client`.
- Pre-existing, unrelated bugs noticed in `ramp-service.service.ts` (undefined `crypto_amount`/`exchangeRateValue`/`exchangeRate` references in `initiateOnRamp`/`initiateOffRamp`) were left untouched — out of scope for this monitoring PR.

### How to try it

```bash
cp .env.example .env
cd alertmanager/secrets && for f in *.example; do cp "$f" "${f%.example}"; done && cd -
docker-compose up -d
```

- Backend metrics: http://localhost:4000/metrics
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Grafana: http://localhost:3001 (`admin` / `admin` by default — see `.env.example`)

### Test plan

- [ ] `cd backend && npm install && npm test` — updated unit tests for `CoinGeckoProvider`, `BinanceProvider`, `ChainlinkProvider`, `BlockchainListenerService`, `WebhookService`, `PaymentService` pass with the new `MetricsService` dependency injected/stubbed.
- [ ] `docker-compose up -d` and confirm `backend:4000/metrics` returns Prometheus text format.
- [ ] Confirm Prometheus targets page shows all scrape jobs as `UP`.
- [ ] Confirm Grafana loads the five dashboards under the "Lumina" folder with data flowing.
- [ ] Trigger a synthetic 5xx burst and confirm `HighErrorRate` fires in Prometheus → Alertmanager → Slack.
