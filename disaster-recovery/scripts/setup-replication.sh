#!/bin/bash

# PostgreSQL Replication Setup Script
# This script configures streaming replication between primary and DR regions

set -e

PRIMARY_REGION="${PRIMARY_REGION:-us-east-1}"
DR_REGION="${DR_REGION:-eu-west-1}"
PRIMARY_CLUSTER="${PRIMARY_CLUSTER:-lumina-primary}"
DR_CLUSTER="${DR_CLUSTER:-lumina-dr}"

echo "Setting up PostgreSQL replication from ${PRIMARY_REGION} to ${DR_REGION}"

# Create replication user on primary
echo "Creating replication user on primary..."
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina <<EOF
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replication_secure_password_change_in_production';
ALTER ROLE replicator CONNECTION LIMIT 5;
EOF

# Configure pg_hba.conf on primary to allow replication connections
echo "Configuring pg_hba.conf on primary..."
kubectl exec -n lumina-primary postgres-master-0 -- bash -c "echo 'host replication replicator 10.0.0.0/8 scram-sha-256' >> /var/lib/postgresql/data/pgdata/pg_hba.conf"

# Reload PostgreSQL configuration
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "SELECT pg_reload_conf();"

# Create replication slot on primary
echo "Creating replication slot on primary..."
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina <<EOF
SELECT * FROM pg_create_physical_replication_slot('replica1');
EOF

# Verify replication status
echo "Verifying replication setup..."
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -d lumina <<EOF
SELECT slot_name, slot_type, active, restart_lsn 
FROM pg_replication_slots 
WHERE slot_name = 'replica1';
EOF

echo "Replication setup completed successfully"
echo "Next steps:"
echo "1. Deploy the DR region PostgreSQL replica"
echo "2. Monitor replication lag using: kubectl exec -n lumina-dr postgres-replica-0 -- psql -U lumina -c 'SELECT * FROM pg_stat_replication;'"
