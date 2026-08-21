#!/bin/bash

# DNS Restoration Script
# Restores DNS routing to primary region after failback

set -e

DNS_PROVIDER="${DNS_PROVIDER:-route53}"
CONFIRMATION="${CONFIRMATION:-false}"

if [ "$CONFIRMATION" != "true" ]; then
    echo "WARNING: This will restore DNS routing to primary region"
    echo "Ensure primary region is healthy before proceeding"
    echo "Set CONFIRMATION=true to proceed"
    exit 1
fi

echo "Restoring DNS routing to primary region..."

if [ "$DNS_PROVIDER" = "route53" ]; then
    echo "Updating Route53 DNS records..."
    
    # Update primary record weight to 100
    aws route53 change-resource-record-sets \
        --hosted-zone-id ${HOSTED_ZONE_ID} \
        --change-batch '{
            "Changes": [{
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": "api.lumina.io",
                    "Type": "A",
                    "SetIdentifier": "primary-weighted",
                    "Weight": 100,
                    "AliasTarget": {
                        "HostedZoneId": "PRIMARY_LB_ZONE_ID",
                        "DNSName": "PRIMARY_LB_DNS",
                        "EvaluateTargetHealth": true
                    }
                }
            }]
        }'
    
    # Update DR record weight to 0
    aws route53 change-resource-record-sets \
        --hosted-zone-id ${HOSTED_ZONE_ID} \
        --change-batch '{
            "Changes": [{
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": "api.lumina.io",
                    "Type": "A",
                    "SetIdentifier": "dr-weighted",
                    "Weight": 0,
                    "AliasTarget": {
                        "HostedZoneId": "DR_LB_ZONE_ID",
                        "DNSName": "DR_LB_DNS",
                        "EvaluateTargetHealth": true
                    }
                }
            }]
        }'
    
    echo "Route53 DNS restored successfully"
    
elif [ "$DNS_PROVIDER" = "cloudflare" ]; then
    echo "Updating Cloudflare load balancer..."
    
    # Update pool weights via Cloudflare API
    curl -X PATCH "https://api.cloudflare.com/client/v4/user/load_balancers/LB_ID" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "default_pools": ["primary-region"],
            "fallback_pool": "dr-region"
        }'
    
    echo "Cloudflare DNS restored successfully"
fi

echo "DNS restoration completed. Traffic is now routing to primary region."
