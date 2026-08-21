#!/bin/bash

# Data Consistency Verification Script
# Verifies data consistency between primary and DR regions

set -e

PRIMARY_NAMESPACE="${PRIMARY_NAMESPACE:-lumina-primary}"
DR_NAMESPACE="${DR_NAMESPACE:-lumina-dr}"

echo "=== Data Consistency Verification ==="
echo "Primary Namespace: ${PRIMARY_NAMESPACE}"
echo "DR Namespace: ${DR_NAMESPACE}"
echo ""

# Get table list
echo "--- Checking Table Consistency ---"
TABLES=$(kubectl exec -n ${PRIMARY_NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';")

for table in $TABLES; do
    table=$(echo $table | xargs)
    if [ -z "$table" ]; then continue; fi
    
    PRIMARY_COUNT=$(kubectl exec -n ${PRIMARY_NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina -t -c "SELECT COUNT(*) FROM ${table};")
    DR_COUNT=$(kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -t -c "SELECT COUNT(*) FROM ${table};")
    
    if [ "$PRIMARY_COUNT" = "$DR_COUNT" ]; then
        echo "✓ ${table}: Primary=${PRIMARY_COUNT}, DR=${DR_COUNT}"
    else
        echo "✗ ${table}: Primary=${PRIMARY_COUNT}, DR=${DR_COUNT} (MISMATCH)"
    fi
done

# Check checksums for critical tables
echo ""
echo "--- Checking Data Checksums ---"
CRITICAL_TABLES=("users" "payments" "merchants" "transactions")

for table in "${CRITICAL_TABLES[@]}"; do
    echo "Calculating checksum for ${table}..."
    
    PRIMARY_CHECKSUM=$(kubectl exec -n ${PRIMARY_NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina -t -c "SELECT md5(string_agg(id::text, '')) FROM ${table};")
    DR_CHECKSUM=$(kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -t -c "SELECT md5(string_agg(id::text, '')) FROM ${table};")
    
    if [ "$PRIMARY_CHECKSUM" = "$DR_CHECKSUM" ]; then
        echo "✓ ${table}: Checksums match"
    else
        echo "✗ ${table}: Checksums differ (Primary=${PRIMARY_CHECKSUM}, DR=${DR_CHECKSUM})"
    fi
done

# Check replication lag
echo ""
echo "--- Replication Lag Check ---"
REPLICATION_LAG=$(kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -t -c "
SELECT CASE 
    WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() 
    THEN 0 
    ELSE EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) 
END as lag_seconds;")

echo "Replication lag: ${REPLICATION_LAG} seconds"

if (( $(echo "$REPLICATION_LAG > 300" | bc -l) )); then
    echo "WARNING: Replication lag exceeds 5 minutes"
else
    echo "Replication lag is within acceptable range"
fi

# Check for data drift
echo ""
echo "--- Data Drift Analysis ---"
kubectl exec -n ${PRIMARY_NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina -c "
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY tablename;
"

echo ""
echo "Data consistency verification completed"
