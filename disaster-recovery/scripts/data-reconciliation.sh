#!/bin/bash

# Data Reconciliation Script
# Identifies and reconciles data differences between regions

set -e

PRIMARY_NAMESPACE="${PRIMARY_NAMESPACE:-lumina-primary}"
DR_NAMESPACE="${DR_NAMESPACE:-lumina-dr}"
DRY_RUN="${DRY_RUN:-true}"

echo "=== Data Reconciliation ==="
echo "Primary Namespace: ${PRIMARY_NAMESPACE}"
echo "DR Namespace: ${DR_NAMESPACE}"
echo "Dry Run: ${DRY_RUN}"
echo ""

# Get tables with potential discrepancies
echo "--- Identifying Data Discrepancies ---"
TABLES=$(kubectl exec -n ${PRIMARY_NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';")

DISCREPANCIES_FOUND=false

for table in $TABLES; do
    table=$(echo $table | xargs)
    if [ -z "$table" ]; then continue; fi
    
    PRIMARY_COUNT=$(kubectl exec -n ${PRIMARY_NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina -t -c "SELECT COUNT(*) FROM ${table};")
    DR_COUNT=$(kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -t -c "SELECT COUNT(*) FROM ${table};")
    
    if [ "$PRIMARY_COUNT" != "$DR_COUNT" ]; then
        echo "Discrepancy found in ${table}: Primary=${PRIMARY_COUNT}, DR=${DR_COUNT}"
        DISCREPANCIES_FOUND=true
        
        # Find missing records
        echo "  Analyzing missing records..."
        
        # Get primary IDs
        kubectl exec -n ${PRIMARY_NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina -t -c "SELECT id FROM ${table} ORDER BY id;" > /tmp/primary_ids.txt
        # Get DR IDs
        kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -d lumina -t -c "SELECT id FROM ${table} ORDER BY id;" > /tmp/dr_ids.txt
        
        # Find differences
        MISSING_IN_DR=$(comm -23 <(sort /tmp/primary_ids.txt) <(sort /tmp/dr_ids.txt))
        MISSING_IN_PRIMARY=$(comm -13 <(sort /tmp/primary_ids.txt) <(sort /tmp/dr_ids.txt))
        
        if [ -n "$MISSING_IN_DR" ]; then
            echo "  Missing in DR: $(echo "$MISSING_IN_DR" | wc -l) records"
        fi
        
        if [ -n "$MISSING_IN_PRIMARY" ]; then
            echo "  Missing in Primary: $(echo "$MISSING_IN_PRIMARY" | wc -l) records"
        fi
        
        # Cleanup
        rm -f /tmp/primary_ids.txt /tmp/dr_ids.txt
    fi
done

if [ "$DISCREPANCIES_FOUND" = false ]; then
    echo "✓ No data discrepancies found"
else
    echo ""
    echo "⚠️  Data discrepancies detected"
    
    if [ "$DRY_RUN" = "true" ]; then
        echo "Running in dry-run mode. Set DRY_RUN=false to perform reconciliation."
    else
        echo "Performing reconciliation..."
        
        # Trigger replication catch-up
        echo "Triggering replication catch-up..."
        kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- psql -U lumina -c "SELECT pg_reload_conf();"
        
        echo "Reconciliation initiated. Monitor replication lag for completion."
    fi
fi

echo ""
echo "Data reconciliation completed"
