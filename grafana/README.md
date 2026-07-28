# Grafana

Dashboards are provisioned automatically from JSON on container start — no
manual import needed.

## Layout

- `provisioning/datasources/datasource.yml` — auto-registers Prometheus
  (`http://prometheus:9090`) as the default data source.
- `provisioning/dashboards/dashboards.yml` — tells Grafana to load dashboard
  JSON from `dashboards/` (mounted into the container at
  `/etc/grafana/provisioning/dashboards/json`) into a "Lumina" folder.
- `dashboards/` — the five dashboards required by the monitoring initiative:
  - `system-overview.json` — CPU, memory, disk, service up/down
  - `api-performance.json` — request rate, latency percentiles, error rate
  - `database-performance.json` — query duration/rate/errors, connection pool
  - `queue-metrics.json` — queue depth, job throughput, job latency/failures
  - `business-metrics.json` — payment volume/success rate, ramp operation volume/success rate

## Trying it locally

```bash
docker-compose up -d grafana prometheus backend
```

Open http://localhost:3001 and log in with `GRAFANA_ADMIN_USER` /
`GRAFANA_ADMIN_PASSWORD` from your `.env` (defaults to `admin` / `admin` —
change this before deploying anywhere shared).

## Editing a dashboard

Dashboards are provisioned as read-only files (`allowUiUpdates: true` lets you
tweak them in the UI, but changes are lost on restart unless you export the
JSON back into `dashboards/`). To make a permanent change: edit the panel in
Grafana, then use the dashboard's JSON Model view (Dashboard settings → JSON
Model) to copy the updated JSON back into the matching file here.
