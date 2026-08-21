#!/bin/bash

# Manual Failover Trigger Script
# Manually triggers DNS failover to DR region

set -e

DNS_PROVIDER="${DNS_PROVIDER:-route53}"
CONFIRMATION="${CONFIRMATION:-false}"

if [ "$CONFIRMATION" != "true" ]; then
    echo "WARNING: This will trigger manual failover to DR region"
    echo "This should only be done during a disaster scenario"
    echo "Set CONFIRMATION=true to proceed"
    exit 1
fi

echo "Triggering manual failover to DR region..."

if [ "$DNS_PROVIDER" = "route53" ]; then
    echo "Updating Route53 DNS records..."
    
    # Update primary record weight to 0
    aws route53 change-resource-record-sets \
        --hosted-zone-id ${HOSTED_ZONE_ID} \
        --change-batch '{
            "Changes": [{
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": "api.lumina.io",
                    "Type": "A",
                    "SetIdentifier": "primary-weighted",
                    "Weight": 0,
                    "AliasTarget": {
                        "HostedZoneId": "PRIMARY_LB_ZONE_ID",
                        "DNSName": "PRIMARY_LB_DNS",
                        "EvaluateTargetHealth": true
                    }
                }
            }]
        }'
    
    # Update DR record weight to 100
    aws route53 change-resource-record-sets \
        --hosted-zone-id ${HOSTED_ZONE_ID} \
        --change-batch '{
            "Changes": [{
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": "api.lumina.io",
                    "Type": "A",
                    "SetIdentifier": "dr-weighted",
                    "Weight": 100,
                    "AliasTarget": {
                        "HostedZoneId": "DR_LB_ZONE_ID",
                        "DNSName": "DR_LB_DNS",
                        "EvaluateTargetHealth": true
                    }
                }
            }]
        }'
    
    echo "Route53 failover triggered successfully"
    
elif [ "$DNS_PROVIDER" = "cloudflare" ]; then
    echo "Updating Cloudflare load balancer..."
    
    # Update pool weights via Cloudflare API
    curl -X PATCH "https://api.cloudflare.com/client/v4/user/load_balancers/LB_ID" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "default_pools": ["dr-region"],
            "fallback_pool": "primary-region"
        }'
    
    echo "Cloudflare failover triggered successfully"
fi

echo "Failover completed. Traffic is now routing to DR region."
echo "Monitor application health and replication status."
