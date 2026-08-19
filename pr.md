## [Feature] Automated Security Scanning and Vulnerability Management

Closes #70

### Overview

Adds continuous, automated security scanning (SAST, dependency, secret,
container, IaC, and DAST) plus an in-app vulnerability management system,
where security checks were previously manual and inconsistent.

SonarQube, Snyk, and Burp Suite from the original issue were intentionally
left out — they need paid accounts/tokens this repo doesn't have. Semgrep,
`npm audit`, and OWASP ZAP cover the same categories (SAST / dependency /
DAST) for free, with no external account required to run in CI. See
"Known gaps" in the docs below for the rest of what's out of scope here.

### What's included

**CI security scanning** (`.github/workflows/security-scan.yml`) — runs on
push to `main`/`develop`, PRs into `main`, and daily on a schedule:
- **SAST** — Semgrep, using the community `p/security-audit`, `p/secrets`,
  `p/typescript`, `p/nodejsscan` rulesets plus custom rules
  (`.semgrep/security-rules.yaml`) for hardcoded secrets, string-concatenated
  SQL, weak hashes (MD5/SHA1), and disabled TLS verification.
- **Dependency scan** — `npm audit --audit-level=high` across `backend/` and
  `frontend/` (matrix job), fails the build on high/critical findings.
- **Secret scan** — Gitleaks over full git history, with an allowlist
  (`.gitleaks.toml`) for test fixtures and `.env.example`.
- **Container scan** — Trivy against the built backend image.
- **IaC scan** — Checkov over the Dockerfiles and `docker-compose.yml`
  (no Terraform directory exists yet to point it at).
- **DAST** — OWASP ZAP baseline scan against the backend, brought up via
  `docker compose` (Postgres + Redis + backend) and health-checked before
  scanning. Runs on push/schedule only, not PRs, to keep PR CI fast.
- SARIF output from Semgrep, Trivy, and Checkov uploads to the repo's
  **Security** tab via `github/codeql-action/upload-sarif`.
- Every job optionally forwards its results into the vulnerability dashboard
  (`POST /security/scans/ingest`) when `SECURITY_API_URL` /
  `SECURITY_SCAN_TOKEN` secrets are configured — a no-op otherwise.
- `.github/dependabot.yml` — weekly PRs for `backend`/`frontend` npm deps,
  the backend's Docker base image, and GitHub Actions versions.

**Vulnerability management** (`backend/src/security/`)
- `Vulnerability` / `SecurityEvent` entities (`entities/`).
- `ScanResultParser` normalizes SARIF (Semgrep/Trivy/ZAP), `npm audit`, and
  Gitleaks reports into a common shape, deduplicated by a fingerprint of
  (source, rule, affected component, location) — re-ingesting a known
  finding updates its details but never touches `status`/`assigned_to`, so
  triage state survives repeat scans.
- `VulnerabilityManagementService` — ingest, list/get, assign, resolve,
  ignore, and a dashboard (open counts by severity/type, 30-day trend).
  Every state transition is recorded as a `SecurityEvent` for audit history.
- `SecurityAlertService` — logs every CRITICAL finding and optionally POSTs
  a summary to `SECURITY_ALERT_WEBHOOK_URL` (e.g. a Slack incoming webhook).
- `SecurityController`:
  - `POST /security/scans/ingest` — guarded by a shared-secret `x-scan-token`
    header (`ScanIngestGuard`), since CI posts here, not a logged-in user.
  - `GET /security/dashboard`, `GET /security/vulnerabilities[/:id]`,
    `POST /security/vulnerabilities/:id/{assign,resolve,ignore}` — behind
    the existing `JwtAuthGuard` + `RolesGuard(Role.ADMIN)`.
- Wired into `AppModule`.

**Docs** — `docs/SECURITY_SCANNING.md` covers what each job checks, how to
enable CI→dashboard reporting and webhook alerts, local commands to run each
scanner, and known gaps. `SECURITY_SCAN_TOKEN` / `SECURITY_ALERT_WEBHOOK_URL`
added to `.env.example`.

### Testing

- 15 new unit tests (`backend/src/security/**/*.spec.ts`): SARIF severity
  mapping (CVSS score vs. level fallback), CVE extraction, fingerprint
  stability across re-scans, npm-audit/Gitleaks mapping, create-vs-update-
  on-ingest, critical-finding alerting, status preservation on re-scan,
  assign/resolve, and dashboard grouping — all passing.
- `tsc --noEmit` clean for the new module.
- Full existing backend test suite re-run: no regressions from this change
  (pre-existing failures in `crypto`/`distributed-ledger` specs are
  unrelated — ESM import issues and a private-property access, both present
  before this branch).
- All new YAML (`security-scan.yml`, `dependabot.yml`, Semgrep rules)
  validated with a YAML parser.

### Manual verification still needed

- The CI workflow itself (Semgrep/Trivy/Checkov/ZAP/Gitleaks marketplace
  actions, docker-compose health-check timing) hasn't run in GitHub Actions
  yet — needs a live run on this PR to confirm each job passes end-to-end.
- CI→dashboard reporting and the Slack alert webhook are exercised by unit
  tests only; wiring real secrets and confirming an ingested finding shows
  up in `GET /security/dashboard` against a deployed backend is a follow-up.
