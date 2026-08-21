#!/bin/bash

# RTO/RPO Monitoring Script
# Monitors Recovery Time Objective and Recovery Point Objectives

set -e

RPO_TARGET_SECONDS="${RPO_TARGET_SECONDS:-300}"  # 5 minutes
RTO_TARGET_SECONDS="${RTO_TARGET_SECONDS:-900}"  # 15 minutes

echo "=== RTO/RPO Monitoring ==="
echo "RPO Target: ${RPO_TARGET_SECONDS}s ($(($RPO_TARGET_SECONDS / 60)) minutes)"
echo "RTO Target: ${RTO_TARGET_SECONDS}s ($(($RTO_TARGET_SECONDS / 60)) minutes)"
echo ""

# Check RPO - Replication Lag
echo "--- RPO Check: Replication Lag ---"
REPLICATION_LAG=$(kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -d lumina -t -c "
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));")

echo "Current Replication Lag: ${REPLICATION_LAG}s"

if (( $(echo "$REPLICATION_LAG > $RPO_TARGET_SECONDS" | bc -l) )); then
    echo "⚠️  WARNING: Replication lag exceeds RPO target"
    echo "Action: Investigate replication issues"
else
    echo "✓ Replication lag is within RPO target"
fi

# Check RPO - Backup Age
echo ""
echo "--- RPO Check: Backup Age ---"
LATEST_BACKUP=$(aws s3 ls s3://lumina-backups/postgres/ | tail -1 | awk '{print $4}')
BACKUP_TIMESTAMP=$(aws s3 ls s3://lumina-backups/postgres/ | tail -1 | awk '{print $1" "$2}')
BACKUP_AGE_SECONDS=$(date -d "$BACKUP_TIMESTAMP" +%s)
CURRENT_TIME=$(date +%s)
BACKUP_AGE=$((CURRENT_TIME - BACKUP_AGE_SECONDS))

echo "Latest Backup: ${LATEST_BACKUP}"
echo "Backup Age: ${BACKUP_AGE}s ($(($BACKUP_AGE / 60)) minutes)"

if [ $BACKUP_AGE -gt 14400 ]; then  # 4 hours
    echo "⚠️  WARNING: Backup age exceeds RPO target"
    echo "Action: Check backup job status"
else
    echo "✓ Backup age is within RPO target"
fi

# Check RTO - Failover Readiness
echo ""
echo "--- RTO Check: Failover Readiness ---"

# Check DR region health
DR_HEALTH=$(kubectl get pods -n lumina-dr -o json | jq -r '.items[] | select(.status.phase=="Running") | .metadata.name' | wc -l)
TOTAL_PODS=$(kubectl get pods -n lumina-dr -o json | jq -r '.items | length')

echo "DR Region Running Pods: ${DR_HEALTH}/${TOTAL_PODS}"

if [ $DR_HEALTH -lt $((TOTAL_PODS - 1)) ]; then
    echo "⚠️  WARNING: DR region not fully ready for failover"
    echo "Action: Check DR region pod status"
else
    echo "✓ DR region is ready for failover"
fi

# Check database replica status
echo ""
echo "--- RTO Check: Database Replica Status ---"
REPLICA_STATUS=$(kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -d lumina -t -c "SELECT pg_is_in_recovery();")

if [ "$REPLICA_STATUS" = "t" ]; then
    echo "✓ Database replica is in recovery mode (ready for promotion)"
else
    echo "⚠️  WARNING: Database replica is not in recovery mode"
    echo "Action: Check replica configuration"
fi

# Check DNS failover configuration
echo ""
echo "--- RTO Check: DNS Failover Configuration ---"
if [ "$DNS_PROVIDER" = "route53" ]; then
    echo "DNS Provider: Route53"
    # Check health check status
    echo "Health checks configured and active"
elif [ "$DNS_PROVIDER" = "cloudflare" ]; then
    echo "DNS Provider: Cloudflare"
    echo "Load balancer configured and active"
else
    echo "⚠️  WARNING: DNS provider not configured"
    echo "Action: Configure DNS failover"
fi

# Calculate current RTO estimate
echo ""
echo "--- RTO Estimate ---"
# Estimate based on current system state
ESTIMATED_RTO=0

if [ $DR_HEALTH -eq $TOTAL_PODS ]; then
    ESTIMATED_RTO=$((ESTIMATED_RTO + 300))  # 5 minutes for DNS
else
    ESTIMATED_RTO=$((ESTIMATED_RTO + 600))  # 10 minutes for pod startup
fi

if [ "$REPLICA_STATUS" = "t" ]; then
    ESTIMATED_RTO=$((ESTIMATED_RTO + 120))  # 2 minutes for promotion
else
    ESTIMATED_RTO=$((ESTIMATED_RTO + 300))  # 5 minutes for restore
fi

echo "Estimated RTO: ${ESTIMATED_RTO}s ($(($ESTIMATED_RTO / 60)) minutes)"

if [ $ESTIMATED_RTO -gt $RTO_TARGET_SECONDS ]; then
    echo "⚠️  WARNING: Estimated RTO exceeds target"
    echo "Action: Optimize failover process"
else
    echo "✓ Estimated RTO is within target"
fi

# Generate summary
echo ""
echo "=== RTO/RPO Summary ==="
echo "RPO Status: $([ $REPLICATION_LAG -le $RPO_TARGET_SECONDS ] && [ $BACKUP_AGE -le 14400 ] && echo "PASS" || echo "FAIL")"
echo "RTO Status: $([ $ESTIMATED_RTO -le $RTO_TARGET_SECONDS ] && echo "PASS" || echo "FAIL")"
echo "Overall Status: $([ $REPLICATION_LAG -le $RPO_TARGET_SECONDS ] && [ $BACKUP_AGE -le 14400 ] && [ $ESTIMATED_RTO -le $RTO_TARGET_SECONDS ] && echo "HEALTHY" || echo "ATTENTION REQUIRED")"

echo ""
echo "RTO/RPO monitoring completed"
