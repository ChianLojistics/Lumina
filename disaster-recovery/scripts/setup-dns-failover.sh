#!/bin/bash

# DNS Failover Setup Script
# Configures Route53 or Cloudflare for automatic failover

set -e

DNS_PROVIDER="${DNS_PROVIDER:-route53}"  # Options: route53, cloudflare
PRIMARY_LB_IP="${PRIMARY_LB_IP}"
DR_LB_IP="${DR_LB_IP}"
PRIMARY_DB_IP="${PRIMARY_DB_IP}"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID}"

if [ "$DNS_PROVIDER" = "route53" ]; then
    echo "Setting up Route53 DNS failover..."
    
    # Create health checks
    echo "Creating health checks..."
    PRIMARY_HC_ID=$(aws route53 create-health-check \
        --caller-reference "lumina-primary-$(date +%s)" \
        --health-check-config "IPAddress=${PRIMARY_LB_IP},Port=443,Type=HTTPS,ResourcePath=/health,RequestInterval=30,FailureThreshold=3" \
        --query 'HealthCheck.Id' \
        --output text)
    
    DR_HC_ID=$(aws route53 create-health-check \
        --caller-reference "lumina-dr-$(date +%s)" \
        --health-check-config "IPAddress=${DR_LB_IP},Port=443,Type=HTTPS,ResourcePath=/health,RequestInterval=30,FailureThreshold=3" \
        --query 'HealthCheck.Id' \
        --output text)
    
    DB_HC_ID=$(aws route53 create-health-check \
        --caller-reference "lumina-db-$(date +%s)" \
        --health-check-config "IPAddress=${PRIMARY_DB_IP},Port=5432,Type=TCP,RequestInterval=30,FailureThreshold=3" \
        --query 'HealthCheck.Id' \
        --output text)
    
    echo "Health Check IDs:"
    echo "Primary: ${PRIMARY_HC_ID}"
    echo "DR: ${DR_HC_ID}"
    echo "Database: ${DB_HC_ID}"
    
    # Create failover records
    echo "Creating DNS records with failover..."
    aws route53 change-resource-record-sets \
        --hosted-zone-id ${HOSTED_ZONE_ID} \
        --change-batch file://dns/route53-failover.json
    
    echo "Route53 failover configured successfully"
    
elif [ "$DNS_PROVIDER" = "cloudflare" ]; then
    echo "Setting up Cloudflare load balancing..."
    
    # Create load balancer
    echo "Creating Cloudflare load balancer..."
    curl -X POST "https://api.cloudflare.com/client/v4/user/load_balancers" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d @dns/cloudflare-load-balancing.json
    
    echo "Cloudflare load balancing configured successfully"
    
else
    echo "Invalid DNS provider: ${DNS_PROVIDER}"
    echo "Supported providers: route53, cloudflare"
    exit 1
fi

echo "DNS failover setup completed"
