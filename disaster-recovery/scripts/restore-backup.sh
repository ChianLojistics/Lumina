#!/bin/bash

# PostgreSQL Backup Restoration Script
# Restores PostgreSQL database from S3 backup

set -e

BACKUP_FILE="${1}"
NAMESPACE="${2:-lumina-primary}"
S3_BUCKET="${S3_BUCKET:-s3://lumina-backups/postgres}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file> [namespace]"
    echo "Example: $0 lumina_backup_20240101_120000.sql.gz lumina-dr"
    exit 1
fi

echo "Restoring backup: ${BACKUP_FILE}"
echo "Namespace: ${NAMESPACE}"
echo "S3 Bucket: ${S3_BUCKET}"

# Download backup from S3
echo "Downloading backup from S3..."
aws s3 cp ${S3_BUCKET}/${BACKUP_FILE} /tmp/${BACKUP_FILE}

# Decompress backup
echo "Decompressing backup..."
gunzip -c /tmp/${BACKUP_FILE} > /tmp/restore_backup.sql

# Stop application pods
echo "Stopping application pods..."
kubectl scale deployment/backend -n ${NAMESPACE} --replicas=0

# Restore database
echo "Restoring database..."
kubectl exec -n ${NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina < /tmp/restore_backup.sql

# Restart application pods
echo "Restarting application pods..."
kubectl scale deployment/backend -n ${NAMESPACE} --replicas=3

# Verify restoration
echo "Verifying restoration..."
kubectl exec -n ${NAMESPACE} postgres-master-0 -- psql -U lumina -d lumina -c "SELECT COUNT(*) FROM information_schema.tables;"

# Cleanup
rm -f /tmp/${BACKUP_FILE} /tmp/restore_backup.sql

echo "Backup restoration completed successfully"
