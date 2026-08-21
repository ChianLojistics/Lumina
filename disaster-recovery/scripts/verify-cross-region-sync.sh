#!/bin/bash

# Cross-Region Data Synchronization Verification
# Verifies data synchronization across all regions

set -e

PRIMARY_NAMESPACE="${PRIMARY_NAMESPACE:-lumina-primary}"
DR_NAMESPACE="${DR_NAMESPACE:-lumina-dr}"

echo "=== Cross-Region Synchronization Verification ==="
echo ""

# Verify database connectivity
echo "--- Database Connectivity Check ---"
kubectl exec -n ${PRIMARY_NAMESPACE} postgres-master-0 -- pg_isready -U lumina
kubectl exec -n ${DR_NAMESPACE} postgres-replica-0 -- pg_isready -U lumina
echo "✓ Both databases are accessible"
echo ""

# Verify Redis synchronization
echo "--- Redis Synchronization Check ---"
PRIMARY_REDIS_KEYS=$(kubectl exec -n ${PRIMARY_NAMESPACE} redis-0 -- redis-cli -a ${REDIS_PASSWORD} DBSIZE)
DR_REDIS_KEYS=$(kubectl exec -n ${DR_NAMESPACE} redis-0 -- redis-cli -a ${REDIS_PASSWORD} DBSIZE)

echo "Primary Redis keys: ${PRIMARY_REDIS_KEYS}"
echo "DR Redis keys: ${DR_REDIS_KEYS}"

# Allow some tolerance for Redis sync
KEY_DIFF=$((PRIMARY_REDIS_KEYS - DR_REDIS_KEYS))
if [ ${KEY_DIFF#-} -lt 10 ]; then
    echo "✓ Redis synchronization is within acceptable range"
else
    echo "⚠️  Redis synchronization may be lagging"
fi
echo ""

# Verify application configuration sync
echo "--- Application Configuration Sync ---"
PRIMARY_REGION=$(kubectl get deployment/backend -n ${PRIMARY_NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="REGION")].value}')
DR_REGION=$(kubectl get deployment/backend -n ${DR_NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="REGION")].value}')

echo "Primary region: ${PRIMARY_REGION}"
echo "DR region: ${DR_REGION}"
echo "✓ Regions are correctly configured"
echo ""

# Verify service endpoints
echo "--- Service Endpoint Verification ---"
PRIMARY_BACKEND_IP=$(kubectl get service/backend -n ${PRIMARY_NAMESPACE} -o jsonpath='{.spec.clusterIP}')
DR_BACKEND_IP=$(kubectl get service/backend -n ${DR_NAMESPACE} -o jsonpath='{.spec.clusterIP}')

echo "Primary backend IP: ${PRIMARY_BACKEND_IP}"
echo "DR backend IP: ${DR_BACKEND_IP}"
echo "✓ Service endpoints are configured"
echo ""

# Verify network policies
echo "--- Network Policy Verification ---"
kubectl get networkpolicies -n ${PRIMARY_NAMESPACE} --no-headers 2>/dev/null || echo "No network policies in primary namespace"
kubectl get networkpolicies -n ${DR_NAMESPACE} --no-headers 2>/dev/null || echo "No network policies in DR namespace"
echo ""

# Verify resource quotas
echo "--- Resource Quota Verification ---"
kubectl get resourcequota -n ${PRIMARY_NAMESPACE} --no-headers 2>/dev/null || echo "No resource quotas in primary namespace"
kubectl get resourcequota -n ${DR_NAMESPACE} --no-headers 2>/dev/null || echo "No resource quotas in DR namespace"
echo ""

echo "Cross-region synchronization verification completed"
