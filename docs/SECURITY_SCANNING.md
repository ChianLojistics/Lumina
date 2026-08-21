# Automated Security Scanning

Implements issue #70. Continuous scanning runs on every push to `main`/`develop`,
every PR into `main`, and once a day on a schedule, via
[`.github/workflows/security-scan.yml`](../.github/workflows/security-scan.yml).

## What runs

| Check | Tool | Job | Scope |
|---|---|---|---|
| SAST | Semgrep (`p/security-audit`, `p/secrets`, `p/typescript`, `p/nodejsscan` + [`.semgrep/security-rules.yaml`](../.semgrep/security-rules.yaml)) | `sast` | whole repo |
| Dependency scan | `npm audit` | `dependency-scan` | `backend/`, `frontend/` (matrix) |
| Secret scan | Gitleaks ([`.gitleaks.toml`](../.gitleaks.toml)) | `secret-scan` | full git history |
| Container scan | Trivy | `container-scan` | `backend` image |
| IaC scan | Checkov | `infrastructure-scan` | `Dockerfile`s, `docker-compose.yml` |
| DAST | OWASP ZAP baseline ([`.zap/rules.tsv`](../.zap/rules.tsv)) | `dast` | `backend` running via docker compose, `push`/`schedule` only (not PRs, to keep PR CI fast) |

All jobs are free/OSS and need no external account. SonarQube, Snyk, and Burp Suite
(mentioned in the original issue) were intentionally left out because they require
paid accounts/API tokens this repo doesn't have configured; Semgrep + npm audit +
ZAP cover the same categories (SAST / dependency / DAST) without that dependency.
If the team later gets a Snyk or SonarQube account, add the corresponding action
as a new job following the same pattern and gate it on the relevant `secrets.*`
being present, the way `dast` and the `Report to security dashboard` steps do.

SARIF results (Semgrep, Trivy, Checkov) are uploaded to the **Security** tab of
the GitHub repo automatically via `github/codeql-action/upload-sarif`.

## Vulnerability management

Findings can also be pushed into the in-app dashboard, implemented in
[`backend/src/security/`](../backend/src/security/):

- `POST /security/scans/ingest` — accepts a SARIF, npm-audit, or Gitleaks report
  (see `IngestScanDto`) and upserts `Vulnerability` rows, deduplicated by a
  fingerprint of (source, rule, component, location). Re-ingesting a known
  finding updates its details but never touches `status`/`assigned_to`, so
  triage state survives repeat scans. Guarded by a shared-secret header
  (`x-scan-token`), not a user session — see `ScanIngestGuard`.
- `GET /security/dashboard` — counts by severity/type and a 30-day trend.
- `GET /security/vulnerabilities`, `GET /security/vulnerabilities/:id` — listing/detail.
- `POST /security/vulnerabilities/:id/assign|resolve|ignore` — triage actions,
  each recorded as a `SecurityEvent` for audit history.

Admin-role JWT required for everything except `/scans/ingest`.

### Enabling CI → dashboard reporting

Unset by default. To wire it up, add these repo/org secrets:

- `SECURITY_API_URL` — base URL of a deployed backend (e.g. `https://api.lumina.example`)
- `SECURITY_SCAN_TOKEN` — must match the backend's `SECURITY_SCAN_TOKEN` env var

Every scan job's "Report to security dashboard" step is a no-op until both are set.

### Alerting

`SecurityAlertService` logs every CRITICAL finding and, if `SECURITY_ALERT_WEBHOOK_URL`
is set (e.g. a Slack incoming webhook), POSTs a summary there too.

## Local usage

```bash
# SAST
docker run --rm -v "$PWD:/src" semgrep/semgrep semgrep scan --config auto --config .semgrep/security-rules.yaml

# Dependency scan
cd backend && npm audit
cd frontend && npm audit

# Secret scan
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo

# Container scan
docker build -t lumina/payment-service ./backend
docker run --rm aquasec/trivy image lumina/payment-service
```

## Known gaps / follow-ups

- PCI DSS / SOC 2 compliance scanning and formal security training materials
  from the original issue are process/org work, not something a CI job can
  cover, and are out of scope here.
- No Terraform/IaC directory exists yet in this repo, so `infrastructure-scan`
  currently only checks the Dockerfiles and `docker-compose.yml`. Point Checkov
  at a `framework: terraform` directory once one exists.
