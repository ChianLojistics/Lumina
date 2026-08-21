# Service Degradation Runbook

## Overview
This runbook handles partial service degradation where some functionality is impaired but the system remains operational.

## Detection

### Automated Detection
- Error rate increase > 5%
- Latency increase > 50%
- Throughput decrease > 20%
- Health check failures

### Manual Detection
- Customer reports
- Support ticket spikes
- Monitoring dashboard alerts
- Performance degradation notices

## Severity Classification

| Severity | Impact | Response Time |
|----------|--------|---------------|
| P0 - Critical | Complete service outage | 5 minutes |
| P1 - High | Major functionality broken | 15 minutes |
| P2 - Medium | Partial functionality affected | 1 hour |
| P3 - Low | Performance degradation | 4 hours |

## Common Scenarios

### Scenario 1: High Error Rates

**Symptoms**
- 5xx errors increasing
- Failed API calls
- Transaction failures

**Investigation Steps**

1. **Check Error Metrics**
   ```bash
   # Check Prometheus error rate
   curl http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])
   
   # Check application logs
   kubectl logs deployment/backend -n lumina-primary --tail=1000 | grep ERROR
   ```

2. **Identify Error Patterns**
   ```bash
   # Group errors by endpoint
   kubectl logs deployment/backend -n lumina-primary --tail=1000 | \
     grep ERROR | awk '{print $7}' | sort | uniq -c
   ```

3. **Check Database Health**
   ```bash
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   SELECT 
       state,
       count(*)
   FROM pg_stat_activity
   GROUP BY state;
   "
   ```

**Mitigation Actions**

```bash
# Scale up backend
kubectl scale deployment/backend -n lumina-primary --replicas=10

# Enable circuit breakers
kubectl set env deployment/backend -n lumina-primary CIRCUIT_BREAKER_ENABLED=true

# Increase timeouts
kubectl set env deployment/backend -n lumina-primary DB_TIMEOUT=30000
```

### Scenario 2: High Latency

**Symptoms**
- Slow response times
- Timeout errors
- Poor user experience

**Investigation Steps**

1. **Measure Latency**
   ```bash
   # Check application latency
   curl -w "@curl-format.txt" -o /dev/null -s https://api.lumina.io/health
   
   # Check database query performance
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   SELECT 
       query,
       mean_exec_time,
       calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   "
   ```

2. **Check Resource Usage**
   ```bash
   # Check CPU/Memory
   kubectl top pods -n lumina-primary
   
   # Check database connections
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   SELECT count(*) FROM pg_stat_activity;
   "
   ```

**Mitigation Actions**

```bash
# Scale up resources
kubectl set resources deployment/backend -n lumina-primary \
  --limits=cpu=2000m,memory=2Gi \
  --requests=cpu=1000m,memory=1Gi

# Enable caching
kubectl set env deployment/backend -n lumina-primary CACHE_ENABLED=true

# Optimize database
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "VACUUM ANALYZE;"
```

### Scenario 3: Database Connection Pool Exhaustion

**Symptoms**
- Connection timeout errors
- "Too many connections" errors
- Application unable to connect

**Investigation Steps**

1. **Check Connection Count**
   ```bash
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   SELECT 
       count(*) as total_connections,
       count(*) FILTER (WHERE state = 'active') as active_connections,
       count(*) FILTER (WHERE state = 'idle') as idle_connections
   FROM pg_stat_activity;
   "
   ```

2. **Identify Long-Running Queries**
   ```bash
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   SELECT 
       pid,
       now() - pg_stat_activity.query_start AS duration,
       query,
       state
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
   "
   ```

**Mitigation Actions**

```bash
# Terminate long-running queries
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE (now() - query_start) > interval '10 minutes'
  AND state = 'active';
"

# Increase max connections
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
ALTER SYSTEM SET max_connections = 300;
SELECT pg_reload_conf();
"

# Scale up database
kubectl set resources statefulset/postgres-master -n lumina-primary \
  --limits=cpu=4000m,memory=8Gi
```

### Scenario 4: Memory Pressure

**Symptoms**
- OOMKilled pods
- High memory usage
- Swap usage

**Investigation Steps**

1. **Check Memory Usage**
   ```bash
   kubectl top pods -n lumina-primary
   kubectl describe nodes | grep -A 5 "Allocated resources"
   ```

2. **Identify Memory Leaks**
   ```bash
   # Check application memory
   kubectl exec -n lumina-primary backend-0 -- cat /proc/meminfo
   
   # Check Node.js heap
   kubectl exec -n lumina-primary backend-0 -- node -e "console.log(process.memoryUsage())"
   ```

**Mitigation Actions**

```bash
# Increase memory limits
kubectl set resources deployment/backend -n lumina-primary \
  --limits=memory=2Gi \
  --requests=memory=1Gi

# Enable memory profiling
kubectl set env deployment/backend -n lumina-primary NODE_OPTIONS=--max-old-space-size=2048

# Restart affected pods
kubectl rollout restart deployment/backend -n lumina-primary
```

## Gradual Degradation Strategy

### Phase 1: Non-Critical Features
- Disable analytics
- Reduce logging verbosity
- Disable background jobs
- Limit API rate limits

### Phase 2: Secondary Features
- Disable search
- Reduce cache TTL
- Disable real-time updates
- Limit concurrent requests

### Phase 3: Core Features
- Enable read-only mode
- Queue write operations
- Serve cached data
- Implement graceful degradation

## Monitoring During Degradation

### Key Metrics to Watch
- Error rate
- Latency percentiles (p50, p95, p99)
- Throughput
- Resource utilization
- Queue depths

### Alert Thresholds
```yaml
# Adjust alert thresholds during degradation
error_rate: 10%  # Increased from 5%
latency_p95: 2000ms  # Increased from 1000ms
throughput: 100 req/s  # Decreased from 500 req/s
```

## Communication During Degradation

### Internal Updates
- Engineering team: Every 15 minutes
- Management: Every 30 minutes
- Support team: Every 15 minutes

### External Updates
- Status page: Update immediately
- Customer notifications: If P0/P1
- Social media: If extended outage

## Recovery Process

1. **Verify Fix**
   ```bash
   # Test affected functionality
   curl https://api.lumina.io/health
   curl https://api.lumina.io/api/payments/test
   ```

2. **Gradual Restoration**
   ```bash
   # Restore non-critical features first
   kubectl set env deployment/backend -n lumina-primary ANALYTICS_ENABLED=true
   
   # Monitor impact
   kubectl logs -f deployment/backend -n lumina-primary
   ```

3. **Full Restoration**
   ```bash
   # Restore all features
   kubectl set env deployment/backend -n lumina-primary DEGRADED_MODE=false
   
   # Scale to normal capacity
   kubectl scale deployment/backend -n lumina-primary --replicas=3
   ```

## Post-Incident Actions

1. **Root Cause Analysis**
   - Review logs
   - Analyze metrics
   - Identify contributing factors

2. **Process Improvements**
   - Update runbooks
   - Improve monitoring
   - Add automated responses

3. **Prevention Measures**
   - Load testing
   - Capacity planning
   - Circuit breakers
   - Rate limiting

## Escalation Matrix

| Duration | Severity | Escalation |
|----------|----------|------------|
| < 15 minutes | P3 | Team Lead |
| 15-60 minutes | P2 | Engineering Manager |
| 1-4 hours | P1 | VP Engineering |
| > 4 hours | P0 | CTO |

## Related Runbooks
- [Region Failover](./01-region-failover.md)
- [Database Recovery](./02-database-recovery.md)
- [Network Outage](./03-network-outage.md)
