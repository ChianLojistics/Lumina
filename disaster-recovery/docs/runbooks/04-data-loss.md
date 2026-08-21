# Data Loss Incident Runbook

## Overview
This runbook handles data loss incidents and data corruption scenarios.

## Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| P0 - Critical | Complete data loss, production impact | 5 minutes |
| P1 - High | Significant data loss, partial impact | 15 minutes |
| P2 - Medium | Limited data loss, minimal impact | 1 hour |
| P3 - Low | Potential data loss, no impact | 4 hours |

## Immediate Actions

### Phase 1: Containment (0-15 minutes)

1. **Stop Data Operations**
   ```bash
   # Stop application writes
   kubectl scale deployment/backend -n lumina-primary --replicas=0
   
   # Enable maintenance mode
   kubectl set env deployment/backend -n lumina-primary MAINTENANCE_MODE=true
   ```

2. **Preserve Evidence**
   ```bash
   # Take database snapshot
   kubectl exec -n lumina-primary postgres-master-0 -- pg_dumpall > /tmp/emergency_backup.sql
   
   # Copy WAL files
   kubectl exec -n lumina-primary postgres-master-0 -- tar -czf /tmp/wal_backup.tar.gz /var/lib/postgresql/data/pgdata/pg_wal/
   
   # Save to secure location
   aws s3 cp /tmp/emergency_backup.sql s3://lumina-emergency-backups/
   aws s3 cp /tmp/wal_backup.tar.gz s3://lumina-emergency-backups/
   ```

3. **Notify Stakeholders**
   - Incident Commander
   - Database Team
   - Legal Team (if P0/P1)
   - Management (if P0)

### Phase 2: Assessment (15-30 minutes)

1. **Determine Extent of Loss**
   ```bash
   # Check table row counts
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
   SELECT 
       schemaname,
       tablename,
       n_live_tup as row_count
   FROM pg_stat_user_tables
   ORDER BY tablename;
   "
   
   # Compare with expected counts
   # Check audit logs for deleted records
   ```

2. **Identify Timeframe**
   ```bash
   # Check transaction logs
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
   SELECT 
       timestamp,
       operation,
       table_name
   FROM audit_log
   ORDER BY timestamp DESC
   LIMIT 100;
   "
   ```

3. **Determine Recovery Options**
   - Point-in-time recovery
   - Selective restore from backup
   - Manual data reconstruction
   - Accept data loss

### Phase 3: Recovery (30-120 minutes)

#### Option 1: Point-in-Time Recovery

```bash
# Identify recovery point
RECOVERY_TIME="2024-01-01 12:00:00"

# Restore backup
./scripts/restore-backup.sh lumina_backup_YYYYMMDD_HHMMSS.sql.gz lumina-primary

# Configure recovery
kubectl exec -n lumina-primary postgres-master-0 -- bash -c "
echo 'recovery_target_time = \"${RECOVERY_TIME}\"' >> /var/lib/postgresql/data/pgdata/recovery.conf
"

# Start database
kubectl scale statefulset/postgres-master -n lumina-primary --replicas=1
```

#### Option 2: Selective Restore

```bash
# Restore specific tables
kubectl exec -n lumina-primary postgres-master-0 -- pg_restore \
  -U lumina \
  -d lumina \
  -t payments \
  -t transactions \
  /tmp/backup.dump

# Verify restored data
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
SELECT COUNT(*) FROM payments;
SELECT COUNT(*) FROM transactions;
"
```

#### Option 3: Manual Reconstruction

```bash
# Identify lost records from audit logs
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
SELECT * FROM audit_log 
WHERE operation = 'DELETE' 
  AND timestamp >= 'START_TIME' 
  AND timestamp <= 'END_TIME';
"

# Reconstruct data from external sources
# - Payment processor logs
# - Bank statements
# - User records
# - Transaction confirmations
```

### Phase 4: Validation (120-150 minutes)

1. **Verify Data Integrity**
   ```bash
   ./scripts/verify-data-consistency.sh
   ./scripts/data-reconciliation.sh
   ```

2. **Run Data Quality Checks**
   ```bash
   # Check for orphaned records
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
   SELECT * FROM payments WHERE user_id NOT IN (SELECT id FROM users);
   "
   
   # Verify referential integrity
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
   SELECT COUNT(*) FROM transactions WHERE payment_id IS NULL;
   "
   ```

3. **Test Application Functionality**
   - User authentication
   - Payment processing
   - Data retrieval
   - Report generation

### Phase 5: Restoration (150-180 minutes)

1. **Resume Operations**
   ```bash
   # Disable maintenance mode
   kubectl set env deployment/backend -n lumina-primary MAINTENANCE_MODE=false
   
   # Scale up application
   kubectl scale deployment/backend -n lumina-primary --replicas=3
   ```

2. **Monitor System**
   ```bash
   # Watch for errors
   kubectl logs -f deployment/backend -n lumina-primary
   
   # Monitor performance
   kubectl top pods -n lumina-primary
   ```

## Post-Incident Activities

### Documentation

1. **Incident Report**
   - Timeline of events
   - Root cause analysis
   - Impact assessment
   - Recovery actions taken

2. **Data Loss Assessment**
   - Records lost
   - Financial impact
   - Customer impact
   - Regulatory implications

3. **Prevention Measures**
   - Process improvements
   - Technical safeguards
   - Monitoring enhancements

### Communication

1. **Internal Communication**
   - Engineering team
   - Management
   - Support team
   - Legal/compliance

2. **External Communication**
   - Affected customers
   - Regulatory bodies (if required)
   - Public statement (if significant)

### Process Improvements

1. **Review Backup Strategy**
   - Backup frequency
   - Retention policies
   - Restoration testing
   - Offsite storage

2. **Enhance Monitoring**
   - Data loss detection
   - Anomaly alerts
   - Audit logging
   - Change tracking

3. **Implement Safeguards**
   - Soft delete instead of hard delete
   - Confirmation dialogs for destructive operations
   - Data validation before writes
   - Transaction rollbacks

## Legal and Compliance Considerations

### Data Breach Notification
- Check local regulations
- Determine notification requirements
- Prepare notification templates
- Consult legal counsel

### Audit Trail Preservation
- Preserve all logs
- Document recovery process
- Maintain chain of custody
- Secure evidence

### Regulatory Reporting
- GDPR (if EU data affected)
- PCI DSS (if payment data)
- SOX (if financial reporting)
- Industry-specific regulations

## Escalation Contacts

| Role | Contact | Escalation Trigger |
|------|---------|-------------------|
| Incident Commander | [Contact] | All data loss incidents |
| Database Team Lead | [Contact] | P1 and above |
| Legal Counsel | [Contact] | P0/P1 incidents |
| CTO | [Contact] | P0 incidents |
| Compliance Officer | [Contact] | Regulatory implications |

## Related Runbooks
- [Database Recovery](./02-database-recovery.md)
- [Region Failover](./01-region-failover.md)
- [Security Incident](./06-security-incident.md)
