# Network Outage Runbook

## Overview
This runbook handles network connectivity issues between regions or to external services.

## Scenarios

### Scenario 1: Primary Region Network Isolation

**Symptoms**
- Cannot reach primary region APIs
- Health checks failing
- Replication stopped

**Recovery Steps**

1. **Diagnose Network Issue**
   ```bash
   # Test connectivity from DR to primary
   kubectl exec -n lumina-dr backend-0 -- ping postgres-master.lumina-primary.svc.cluster.local
   
   # Check DNS resolution
   kubectl exec -n lumina-dr backend-0 -- nslookup api.lumina.io
   
   # Test external connectivity
   kubectl exec -n lumina-dr backend-0 -- curl -I https://www.google.com
   ```

2. **Check Cloud Provider Status**
   - AWS Status Dashboard
   - Cloudflare Status Page
   - Network provider status

3. **Initiate Failover**
   ```bash
   CONFIRMATION=true ./scripts/trigger-failover.sh
   ```

4. **Monitor DR Region**
   ```bash
   kubectl get pods -n lumina-dr
   kubectl top nodes
   ```

### Scenario 2: Cross-Region Connectivity Loss

**Symptoms**
- Replication lag increasing
- Cannot reach DR region
- Data sync failures

**Recovery Steps**

1. **Check VPN/Tunnel Status**
   ```bash
   # Check VPN connections
   kubectl get vpn -n kube-system
   
   # Check network policies
   kubectl get networkpolicies -A
   ```

2. **Verify DNS Configuration**
   ```bash
   # Check DNS records
   dig api.lumina.io +short
   nslookup api.lumina.io
   
   # Check Route53 health checks
   aws route53 list-health-checks
   ```

3. **Test Alternative Routes**
   ```bash
   # Test via different network paths
   traceroute api.lumina.io
   mtr api.lumina.io
   ```

4. **Implement Workaround**
   - Increase local caching
   - Enable offline mode for non-critical features
   - Queue requests for later processing

### Scenario 3: External Service Outage

**Symptoms**
- Cannot reach Stellar network
- Payment processing failures
- API gateway errors

**Recovery Steps**

1. **Identify Affected Services**
   ```bash
   # Check Stellar connectivity
   kubectl exec -n lumina-primary backend-0 -- curl https://horizon-testnet.stellar.org
   
   # Check payment processing
   kubectl logs backend -n lumina-primary | grep "stellar"
   ```

2. **Implement Circuit Breaker**
   ```bash
   # Enable circuit breaker configuration
   kubectl set env deployment/backend -n lumina-primary CIRCUIT_BREAKER_ENABLED=true
   ```

3. **Enable Fallback Mechanisms**
   - Use cached data
   - Queue transactions
   - Enable retry logic with exponential backoff

4. **Monitor Service Status**
   - Stellar status page
   - Third-party service dashboards
   - API health endpoints

### Scenario 4: DNS Resolution Issues

**Symptoms**
- Cannot resolve domain names
- Intermittent connection failures
- SSL certificate errors

**Recovery Steps**

1. **Check DNS Configuration**
   ```bash
   # Verify DNS records
   dig api.lumina.io ANY
   dig api.lumina.io +trace
   
   # Check local DNS
   kubectl get configmap coredns -n kube-system
   ```

2. **Test from Multiple Locations**
   ```bash
   # Test from different regions
   # Use external DNS testing tools
   # Check propagation status
   ```

3. **Update DNS if Needed**
   ```bash
   # Update Route53 records
   aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID --change-batch file://dns/update.json
   
   # Flush DNS caches
   kubectl rollout restart deployment/coredns -n kube-system
   ```

4. **Verify SSL Certificates**
   ```bash
   # Check certificate validity
   openssl s_client -connect api.lumina.io:443 -servername api.lumina.io
   
   # Check certificate expiration
   echo | openssl s_client -connect api.lumina.io:443 2>/dev/null | openssl x509 -noout -dates
   ```

## Prevention Measures

### Network Redundancy
- Multiple network paths
- Cross-connect providers
- Local DNS caching
- CDN integration

### Monitoring
- Network latency monitoring
- DNS resolution monitoring
- External service health checks
- Bandwidth utilization tracking

### Testing
- Regular network failover tests
- DNS propagation testing
- Load balancing verification
- Circuit breaker testing

## Diagnostic Commands

```bash
# Network connectivity
ping -c 4 target_host
traceroute target_host
mtr -r -c 10 target_host

# DNS troubleshooting
dig target_host ANY
nslookup target_host
host target_host

# Port connectivity
telnet target_host port
nc -zv target_host port
nmap -p port target_host

# SSL/TLS
openssl s_client -connect target_host:443
curl -vI https://target_host
```

## Escalation Matrix

| Issue Type | Response Time | Escalation |
|------------|---------------|------------|
| Complete network outage | 5 minutes | CTO, Network Team |
| DNS issues | 15 minutes | DevOps Team |
| External service outage | 30 minutes | Engineering Manager |
| Performance degradation | 1 hour | Team Lead |

## Contacts

- **Network Team**: [Contact Info]
- **Cloud Provider Support**: [Contact Info]
- **DNS Provider**: [Contact Info]
- **External Service Providers**: [Contact Info]

## Related Runbooks
- [Region Failover](./01-region-failover.md)
- [Service Degradation](./05-service-degradation.md)
