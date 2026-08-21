#!/bin/bash

# PostgreSQL Replica Promotion Script
# Promotes the DR replica to primary during failover

set -e

DR_REGION="${DR_REGION:-eu-west-1}"
CONFIRMATION="${CONFIRMATION:-false}"

if [ "$CONFIRMATION" != "true" ]; then
    echo "WARNING: This will promote the DR replica to primary"
    echo "This should only be done during a failover scenario"
    echo "Set CONFIRMATION=true to proceed"
    exit 1
fi

echo "Promoting DR replica to primary in ${DR_REGION}..."

# Stop replication and promote to primary
kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -c "SELECT pg_promote();"

# Update application configuration to point to new primary
echo "Updating application configuration..."
kubectl set env deployment/backend -n lumina-dr IS_PRIMARY=true READ_ONLY_MODE=false

# Scale up DR region backend
echo "Scaling up DR region backend..."
kubectl scale deployment/backend -n lumina-dr --replicas=5

# Verify promotion
echo "Verifying promotion..."
kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -c "
SELECT 
    pg_is_in_recovery() as is_replica,
    pg_current_wal_lsn() as current_lsn;
"

echo "Replica promotion completed successfully"
echo "Next steps:"
echo "1. Update DNS to point to DR region"
echo "2. Monitor application health"
echo "3. Notify stakeholders of failover"
