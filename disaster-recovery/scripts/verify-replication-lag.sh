#!/bin/bash

# Replication Lag Monitoring Script
# Monitors and alerts on replication lag between regions

set -e

DR_NAMESPACE="${DR_NAMESPACE:-lumina-dr}"
ALERT_THRESHOLD="${ALERT_THRESHOLD:-300}"  # 5 minutes in seconds

echo "=== Replication Lag Monitoring ==="
echo "DR Namespace: ${DR_NAMESPACE}"
echo "Alert Threshold: ${ALERT_THRESHOLD} seconds"
echo ""

# Get replication statistics
echo "--- Replication Statistics ---"
kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -c "
SELECT 
    now() as current_time,
    pg_last_wal_receive_lsn() as last_receive_lsn,
    pg_last_wal_replay_lsn() as last_replay_lsn,
    pg_last_xact_replay_timestamp() as last_replay_timestamp,
    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds,
    pg_is_in_recovery() as is_in_recovery;
"

# Calculate lag
LAG_SECONDS=$(kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -t -c "
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));")

echo ""
echo "Current Replication Lag: ${LAG_SECONDS} seconds"

# Check if lag exceeds threshold
if (( $(echo "$LAG_SECONDS > $ALERT_THRESHOLD" | bc -l) )); then
    echo "⚠️  ALERT: Replication lag exceeds threshold of ${ALERT_THRESHOLD} seconds"
    echo "Action required: Investigate replication issues"
    exit 1
else
    echo "✓ Replication lag is within acceptable range"
fi

# Check WAL size
echo ""
echo "--- WAL Size Information ---"
kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -c "
SELECT 
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), pg_last_wal_replay_lsn())) as pending_wal_size;
"

# Check replication slot status
echo ""
echo "--- Replication Slot Status ---"
kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -c "
SELECT 
    slot_name,
    slot_type,
    active,
    restart_lsn,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag_bytes
FROM pg_replication_slots;
"

echo ""
echo "Replication lag monitoring completed"
