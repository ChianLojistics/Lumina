# Database Recovery Runbook

## Overview
This runbook provides procedures for recovering PostgreSQL databases from various failure scenarios.

## Scenarios

### Scenario 1: Primary Database Corruption

**Symptoms**
- Database startup failures
- Query errors indicating corruption
- Inconsistent data

**Recovery Steps**

1. **Identify Corruption**
   ```bash
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "SELECT * FROM pg_stat_database;"
   kubectl logs postgres-master-0 -n lumina-primary
   ```

2. **Stop Corrupted Primary**
   ```bash
   kubectl scale statefulset/postgres-master -n lumina-primary --replicas=0
   ```

3. **Promote DR Replica**
   ```bash
   CONFIRMATION=true ./scripts/promote-replica.sh
   ```

4. **Restore from Backup (if needed)**
   ```bash
   # List available backups
   aws s3 ls s3://lumina-backups/postgres/
   
   # Restore latest backup
   ./scripts/restore-backup.sh lumina_backup_YYYYMMDD_HHMMSS.sql.gz lumina-dr
   ```

5. **Verify Recovery**
   ```bash
   ./scripts/verify-data-consistency.sh
   ```

### Scenario 2: Replication Lag

**Symptoms**
- High replication lag (> 5 minutes)
- Data inconsistency between regions
- WAL buildup on primary

**Recovery Steps**

1. **Check Replication Status**
   ```bash
   ./scripts/verify-replication-lag.sh
   ```

2. **Identify Bottleneck**
   ```bash
   # Check network bandwidth
   kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -c "
   SELECT * FROM pg_stat_replication;
   "
   
   # Check disk I/O
   kubectl exec -n lumina-primary postgres-master-0 -- iostat -x 1 5
   ```

3. **Resolve Common Issues**
   
   **Network Issues:**
   ```bash
   # Check network connectivity
   kubectl exec -n lumina-primary postgres-master-0 -- ping postgres-replica.lumina-dr.svc.cluster.local
   ```
   
   **Disk Space Issues:**
   ```bash
   # Check disk space
   kubectl exec -n lumina-primary postgres-master-0 -- df -h
   
   # Clean up old WAL files
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   SELECT pg_switch_wal();
   "
   ```

4. **Restart Replication (if needed)**
   ```bash
   kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -c "SELECT pg_reload_conf();"
   ```

### Scenario 3: Complete Database Loss

**Symptoms**
- Database pod cannot start
- Data volume is corrupted
- No replica available

**Recovery Steps**

1. **Assess Damage**
   ```bash
   kubectl describe pod postgres-master-0 -n lumina-primary
   kubectl logs postgres-master-0 -n lumina-primary --previous
   ```

2. **Provision New Database**
   ```bash
   # Delete corrupted statefulset
   kubectl delete statefulset postgres-master -n lumina-primary
   
   # Recreate with clean volumes
   kubectl apply -f k8s/primary/postgres-master.yaml
   ```

3. **Restore from Latest Backup**
   ```bash
   # Find latest good backup
   LATEST_BACKUP=$(aws s3 ls s3://lumina-backups/postgres/ | tail -1 | awk '{print $4}')
   
   # Restore backup
   ./scripts/restore-backup.sh ${LATEST_BACKUP} lumina-primary
   ```

4. **Reconfigure Replication**
   ```bash
   ./scripts/setup-replication.sh
   ```

5. **Verify Recovery**
   ```bash
   ./scripts/verify-data-consistency.sh
   ./scripts/verify-replication-lag.sh
   ```

### Scenario 4: Point-in-Time Recovery

**Use Case**
Recover database to a specific point in time before an error occurred.

**Recovery Steps**

1. **Identify Target Time**
   ```bash
   # Determine when error occurred
   kubectl logs backend -n lumina-primary --tail=1000
   ```

2. **Restore Backup**
   ```bash
   # Restore backup from before target time
   ./scripts/restore-backup.sh lumina_backup_YYYYMMDD_HHMMSS.sql.gz lumina-primary
   ```

3. **Replay WAL Logs**
   ```bash
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   SELECT pg_wal_replay_resume();
   "
   ```

4. **Stop at Target Time**
   ```bash
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   SELECT pg_wal_replay_pause();
   "
   ```

5. **Verify State**
   ```bash
   # Check data at target point
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
   SELECT * FROM audit_log WHERE timestamp < 'TARGET_TIME' ORDER BY timestamp DESC LIMIT 10;
   "
   ```

## Backup Verification

Regular backup verification is essential:

```bash
# Run daily backup verification
./scripts/verify-backup.sh

# Test restore process (monthly)
./scripts/restore-backup.sh TEST_BACKUP lumina-test
```

## Performance Considerations

- **Restore Time**: Large databases may take hours to restore
- **Replication Catch-up**: Initial sync may be slow
- **Network Bandwidth**: Cross-region transfers consume bandwidth
- **Storage Costs**: Maintain appropriate retention policies

## Monitoring

Key metrics to monitor:
- Replication lag
- WAL file size
- Disk space usage
- Backup completion time
- Restore success rate

## Escalation

| Situation | Escalation |
|-----------|------------|
| Single database down | Database Team |
| Both databases down | Incident Commander |
| Data loss suspected | CTO, Legal Team |
| Recovery time > 1 hour | VP Engineering |

## Related Runbooks
- [Region Failover](./01-region-failover.md)
- [Data Loss Incident](./04-data-loss.md)
