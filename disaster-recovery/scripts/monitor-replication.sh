#!/bin/bash

# PostgreSQL Replication Monitoring Script
# Monitors replication lag and status between primary and DR regions

set -e

PRIMARY_REGION="${PRIMARY_REGION:-us-east-1}"
DR_REGION="${DR_REGION:-eu-west-1}"

echo "=== PostgreSQL Replication Status ==="
echo "Primary Region: ${PRIMARY_REGION}"
echo "DR Region: ${DR_REGION}"
echo ""

# Check primary status
echo "--- Primary Status ---"
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
SELECT 
    pg_is_in_recovery() as is_replica,
    pg_current_wal_lsn() as current_lsn,
    pg_last_wal_replay_lsn() as last_replay_lsn;
"

# Check replication connections on primary
echo ""
echo "--- Replication Connections ---"
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
SELECT 
    client_addr,
    state,
    sync_state,
    replay_lag,
    flush_lag
FROM pg_stat_replication;
"

# Check replica status
echo ""
echo "--- Replica Status ---"
kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -d lumina -c "
SELECT 
    pg_is_in_recovery() as is_replica,
    pg_last_wal_receive_lsn() as last_receive_lsn,
    pg_last_wal_replay_lsn() as last_replay_lsn,
    pg_last_xact_replay_timestamp() as last_replay_timestamp;
"

# Calculate replication lag
echo ""
echo "--- Replication Lag ---"
RECEIVE_LSN=$(kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -d lumina -t -c "SELECT pg_last_wal_receive_lsn();")
REPLAY_LSN=$(kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -d lumina -t -c "SELECT pg_last_wal_replay_lsn();")

if [ "$RECEIVE_LSN" != "$REPLAY_LSN" ]; then
    echo "WARNING: Replication lag detected"
    echo "Receive LSN: $RECEIVE_LSN"
    echo "Replay LSN: $REPLAY_LSN"
else
    echo "Replication is up to date"
fi

# Check replication slots
echo ""
echo "--- Replication Slots ---"
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina -c "
SELECT 
    slot_name,
    slot_type,
    active,
    restart_lsn,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag_bytes
FROM pg_replication_slots;
"
