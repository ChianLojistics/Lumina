# Region Failover Runbook

## Overview
This runbook provides step-by-step procedures for failing over from the primary region (US East) to the disaster recovery region (EU West).

## Prerequisites
- Access to both Kubernetes clusters
- AWS/Cloudflare credentials for DNS management
- PagerDuty/Slack access for notifications
- Valid SSH keys for database access

## Trigger Conditions
Failover should be initiated when:
- Primary region is unavailable for > 5 minutes
- Database replication lag exceeds 30 minutes
- Network connectivity to primary region is lost
- Multiple health checks fail consecutively

## Automated Failover
The failover controller will automatically trigger failover when:
- 3 consecutive health check failures occur
- Auto-failover is enabled in configuration
- DR region health checks are passing

### Manual Failover Steps

### Phase 1: Assessment (0-5 minutes)

1. **Verify Primary Region Status**
   ```bash
   # Check primary region health
   kubectl get pods -n lumina-primary
   kubectl get nodes
   ./scripts/monitor-replication.sh
   ```

2. **Verify DR Region Health**
   ```bash
   # Check DR region health
   kubectl get pods -n lumina-dr
   kubectl get nodes
   ./scripts/verify-cross-region-sync.sh
   ```

3. **Check Replication Status**
   ```bash
   # Verify replication lag
   ./scripts/verify-replication-lag.sh
   ```

4. **Confirm Failover Decision**
   - Document reason for failover
   - Get approval from incident commander
   - Notify stakeholders

### Phase 2: Database Failover (5-10 minutes)

1. **Promote DR Replica to Primary**
   ```bash
   CONFIRMATION=true ./scripts/promote-replica.sh
   ```

2. **Verify Database Promotion**
   ```bash
   kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -c "SELECT pg_is_in_recovery();"
   # Should return 'f' (false)
   ```

3. **Update Application Configuration**
   ```bash
   # Update DR backend to use promoted database
   kubectl set env deployment/backend -n lumina-dr DATABASE_HOST=postgres-replica
   kubectl set env deployment/backend -n lumina-dr IS_PRIMARY=true READ_ONLY_MODE=false
   ```

4. **Scale Up DR Backend**
   ```bash
   kubectl scale deployment/backend -n lumina-dr --replicas=5
   ```

### Phase 3: DNS Failover (10-15 minutes)

1. **Trigger DNS Failover**
   ```bash
   CONFIRMATION=true DNS_PROVIDER=route53 ./scripts/trigger-failover.sh
   ```

2. **Verify DNS Propagation**
   ```bash
   # Check DNS from multiple locations
   dig api.lumina.io +short
   nslookup api.lumina.io
   ```

3. **Monitor Traffic Shift**
   - Check application metrics
   - Monitor error rates
   - Verify request routing

### Phase 4: Validation (15-20 minutes)

1. **Verify Application Health**
   ```bash
   # Health checks
   curl https://api.lumina.io/health
   curl https://api.lumina.io/metrics
   ```

2. **Verify Data Consistency**
   ```bash
   ./scripts/verify-data-consistency.sh
   ```

3. **Test Critical Endpoints**
   - Payment creation
   - User authentication
   - Transaction processing

4. **Monitor System Metrics**
   - CPU/Memory usage
   - Database connections
   - Request latency

### Phase 5: Communication (20-25 minutes)

1. **Notify Stakeholders**
   - Send status update to Slack
   - Create incident ticket
   - Update status page

2. **Document Incident**
   - Record timeline
   - Document root cause
   - Note any data loss

## Failback Procedure

When primary region is recovered:

1. **Verify Primary Region Health**
   ```bash
   kubectl get pods -n lumina-primary
   ./scripts/monitor-replication.sh
   ```

2. **Set Up Reverse Replication**
   ```bash
   # Configure primary as replica of DR
   ./scripts/setup-replication.sh PRIMARY_REGION=eu-west-1 DR_REGION=us-east-1
   ```

3. **Wait for Replication Sync**
   ```bash
   ./scripts/verify-replication-lag.sh
   # Wait until lag is < 1 minute
   ```

4. **Restore DNS to Primary**
   ```bash
   CONFIRMATION=true ./scripts/restore-dns.sh
   ```

5. **Scale Down DR Region**
   ```bash
   kubectl scale deployment/backend -n lumina-dr --replicas=2
   ```

## Rollback Procedure

If failover fails:

1. **Revert DNS Changes**
   ```bash
   CONFIRMATION=true ./scripts/restore-dns.sh
   ```

2. **Scale Up Primary Region**
   ```bash
   kubectl scale deployment/backend -n lumina-primary --replicas=3
   ```

3. **Investigate Failover Failure**
   - Check logs
   - Review error messages
   - Document issues

## Post-Failover Tasks

1. **Run Data Consistency Check**
   ```bash
   ./scripts/verify-data-consistency.sh
   ./scripts/data-reconciliation.sh
   ```

2. **Update Monitoring**
   - Adjust alert thresholds
   - Update dashboards
   - Configure new metrics

3. **Conduct Post-Mortem**
   - Schedule post-mortem meeting
   - Document lessons learned
   - Update runbook if needed

## Contacts

- **Incident Commander**: [Contact Info]
- **Database Team**: [Contact Info]
- **Network Team**: [Contact Info]
- **DevOps Team**: [Contact Info]

## Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| P0 - Critical | 5 minutes | CTO, VP Engineering |
| P1 - High | 15 minutes | Engineering Manager |
| P2 - Medium | 1 hour | Team Lead |
| P3 - Low | 4 hours | On-call Engineer |

## Related Runbooks
- [Database Recovery](./02-database-recovery.md)
- [Network Outage](./03-network-outage.md)
- [Data Loss Incident](./04-data-loss.md)
