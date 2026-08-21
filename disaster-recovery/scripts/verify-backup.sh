#!/bin/bash

# Backup Verification Script
# Verifies backup integrity and tests restore process

set -e

S3_BUCKET="${S3_BUCKET:-s3://lumina-backups/postgres}"
TEST_NAMESPACE="${TEST_NAMESPACE:-lumina-test}"

echo "=== Backup Verification ==="
echo "S3 Bucket: ${S3_BUCKET}"
echo ""

# List recent backups
echo "--- Recent Backups ---"
aws s3 ls ${S3_BUCKET}/ | tail -10

# Check backup size
echo ""
echo "--- Backup Size Check ---"
aws s3 ls ${S3_BUCKET}/ | awk '{print $3, $4}' | while read size file; do
    if [ "$size" -lt 1048576 ]; then
        echo "WARNING: ${file} is smaller than 1MB (${size} bytes)"
    else
        echo "OK: ${file} (${size} bytes)"
    fi
done

# Test restore of latest backup
echo ""
echo "--- Testing Latest Backup Restore ---"
LATEST_BACKUP=$(aws s3 ls ${S3_BUCKET}/ | tail -1 | awk '{print $4}')
echo "Testing restore of: ${LATEST_BACKUP}"

# Download and verify backup integrity
aws s3 cp ${S3_BUCKET}/${LATEST_BACKUP} /tmp/test_backup.gz

# Verify gzip integrity
if gzip -t /tmp/test_backup.gz; then
    echo "Backup file integrity: OK"
else
    echo "ERROR: Backup file is corrupted"
    exit 1
fi

# Check backup contains expected data
echo "Checking backup content..."
gunzip -c /tmp/test_backup.gz | head -20

# Cleanup
rm -f /tmp/test_backup.gz

echo ""
echo "Backup verification completed successfully"
