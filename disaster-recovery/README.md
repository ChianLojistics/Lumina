# Lumina Disaster Recovery System

Comprehensive disaster recovery infrastructure ensuring business continuity with RTO < 15 minutes and RPO < 5 minutes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Global DNS Layer                            │
│              Route53 / Cloudflare Failover                      │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Primary Region (US)   │     │   DR Region (EU)         │
│   - Active Traffic      │     │   - Standby              │
│   - Master PostgreSQL   │     │   - Replica PostgreSQL   │
│   - Active Kubernetes   │     │   - Standby Kubernetes   │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
                    ┌─────────────────┐
                    │  Cross-Region    │
                    │  Replication     │
                    │  (Streaming)     │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Backup Storage  │
                    │  (S3/GCS)        │
                    └─────────────────┘
```

## Components

- **Multi-Region Kubernetes**: Active-passive deployment across regions
- **Database Replication**: PostgreSQL streaming replication with automatic failover
- **Backup Automation**: Automated backups to S3/GCS with retention policies
- **DNS Failover**: Route53/Cloudflare health-based routing
- **Automated Failover**: Health monitoring and automatic region switching
- **Data Consistency**: Verification tools and checksum validation
- **Chaos Engineering**: Recovery testing framework
- **Monitoring**: RTO/RPO metrics and alerting

## RTO/RPO Targets

| Metric | Target | Current |
|--------|--------|---------|
| RTO (Recovery Time Objective) | < 15 minutes | TBD |
| RPO (Recovery Point Objective) | < 5 minutes | TBD |

## Quick Start

```bash
# Deploy primary region
kubectl apply -f k8s/primary/

# Deploy DR region
kubectl apply -f k8s/dr/

# Setup DNS failover
./scripts/setup-dns-failover.sh

# Run recovery test
./scripts/test-recovery.sh
```

## Documentation

- [Architecture Design](docs/architecture.md)
- [Runbooks](docs/runbooks/)
- [Testing Procedures](docs/testing.md)
- [Business Continuity Plan](docs/bcp.md)
