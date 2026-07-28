# Prometheus

Scrapes metrics from the Lumina backend and infrastructure exporters, and
evaluates the alerting rules in [`alerts/rules.yml`](alerts/rules.yml).

## Layout

- `prometheus.yml` — scrape configuration, retention, and where to find
  Alertmanager and the alert rule files.
- `alerts/rules.yml` — alerting rules (error rate, latency, DB pool
  exhaustion, queue depth, service down).

## Scrape targets

| Job | Target | Metrics |
|---|---|---|
| `lumina-backend` | `backend:4000/metrics` | HTTP, DB query, external service, queue and business metrics (see [`backend/src/common/metrics`](../backend/src/common/metrics)) |
| `node-exporter` | `node-exporter:9100` | Host CPU/memory/disk, for the System Overview dashboard |
| `postgres-exporter` | `postgres-exporter:9187` | Postgres-level connection/transaction stats |
| `prometheus` / `alertmanager` | self | Prometheus/Alertmanager's own health |

## Retention & storage

Configured via CLI flags on the `prometheus` service in `docker-compose.yml`:
`--storage.tsdb.retention.time=15d`, with data persisted in the
`prometheus_data` named volume so it survives container restarts.

## Trying it locally

```bash
docker-compose up -d prometheus alertmanager node-exporter postgres-exporter backend
```

Then open http://localhost:9090 (Prometheus), http://localhost:9090/targets
(scrape target health), and http://localhost:9090/alerts (alert state).
