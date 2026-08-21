# Disaster Recovery Testing Guide

## Overview
This guide covers testing procedures for the Lumina disaster recovery system using chaos engineering principles.

## Testing Philosophy

### Goals
- Validate RTO/RPO targets
- Identify single points of failure
- Test automated failover mechanisms
- Verify data consistency after recovery
- Practice incident response procedures

### Testing Principles
- **Test in production-like environments**: Use staging that mirrors production
- **Start small**: Begin with low-impact experiments
- **Automate**: Make testing repeatable and scheduled
- **Document**: Record all test results and lessons learned
- **Iterate**: Continuously improve based on test findings

## Test Types

### 1. Component Tests
Test individual components in isolation.

#### Database Replication Test
```bash
# Test replication lag under load
./scripts/test-recovery.sh TEST_TYPE=database
```

**What it tests:**
- PostgreSQL streaming replication
- Replication lag under load
- Data consistency between regions

**Success criteria:**
- Replication lag < 5 minutes
- No data loss
- Automatic recovery

#### Network Connectivity Test
```bash
# Test network partition handling
./scripts/test-recovery.sh TEST_TYPE=network
```

**What it tests:**
- Cross-region connectivity
- DNS failover
- Application resilience

**Success criteria:**
- Automatic failover triggers
- DNS updates propagate
- Application remains available

### 2. Integration Tests
Test multiple components together.

#### Automatic Failover Test
```bash
# Test end-to-end failover
./scripts/test-recovery.sh TEST_TYPE=failover
```

**What it tests:**
- Health check detection
- Automatic failover triggering
- DNS failover
- Application failover
- Data consistency

**Success criteria:**
- Failover completes within 15 minutes
- No data loss
- Application remains available
- DNS propagates correctly

#### Full Recovery Test
```bash
# Test complete recovery scenario
./scripts/test-recovery.sh TEST_TYPE=full
```

**What it tests:**
- Complete primary region failure
- DR region takeover
- Data consistency
- Primary region restoration
- Failback procedures

**Success criteria:**
- RTO < 15 minutes
- RPO < 5 minutes
- Zero data loss
- Successful failback

### 3. Chaos Experiments
Use Chaos Mesh to inject failures.

#### Pod Kill Experiment
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-experiment
spec:
  action: pod-kill
  mode: one
  selector:
    labelSelectors:
      app: backend
  duration: "30s"
```

#### Network Delay Experiment
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay-experiment
spec:
  action: delay
  delay:
    latency: "200ms"
  duration: "60s"
```

#### CPU Stress Experiment
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress-experiment
spec:
  stressors:
    cpu:
      workers: 4
      load: 80
  duration: "60s"
```

## Testing Schedule

### Daily Tests (Low Impact)
- Pod kill experiments
- Network delay tests
- Health check validation

### Weekly Tests (Medium Impact)
- Automatic failover tests
- Database stress tests
- Network partition tests

### Monthly Tests (High Impact)
- Full recovery tests
- Complete region failure simulation
- Data consistency validation

## Pre-Test Checklist

Before running any test:

- [ ] Notify stakeholders of planned test
- [ ] Verify monitoring is operational
- [ ] Check backup status
- [ ] Verify DR region health
- [ ] Document baseline metrics
- [ ] Prepare rollback plan
- [ ] Ensure on-call team is available

## Post-Test Procedures

After completing a test:

1. **Cleanup**
   ```bash
   # Remove chaos experiments
   kubectl delete -f chaos/
   
   # Restore normal operations
   kubectl scale deployment/backend -n lumina-primary --replicas=3
   ```

2. **Validation**
   ```bash
   # Verify system health
   ./scripts/verify-data-consistency.sh
   ./scripts/verify-replication-lag.sh
   ./scripts/monitor-rto-rpo.sh
   ```

3. **Documentation**
   - Record test results
   - Document any issues found
   - Update runbooks if needed
   - Share findings with team

## Test Metrics

Track these metrics for each test:

| Metric | Target | Actual |
|--------|--------|--------|
| RTO | < 15 minutes | TBD |
| RPO | < 5 minutes | TBD |
| Data Loss | 0 bytes | TBD |
| Downtime | < 15 minutes | TBD |
| Failover Time | < 10 minutes | TBD |
| DNS Propagation | < 2 minutes | TBD |

## Failure Scenarios

### Scenario 1: Primary Region Failure
**Test:** Complete primary region outage
**Expected:** Automatic failover to DR region
**Validation:** Application availability, data consistency

### Scenario 2: Database Failure
**Test:** Primary database crash
**Expected:** Replica promotion and failover
**Validation:** Data consistency, minimal downtime

### Scenario 3: Network Partition
**Test:** Network isolation between regions
**Expected:** DNS failover, traffic rerouting
**Validation:** Application availability, connectivity

### Scenario 4: Data Corruption
**Test:** Database corruption
**Expected:** Backup restoration
**Validation:** Data integrity, minimal data loss

## Automation

### Schedule Tests
```bash
# Weekly chaos schedule
./scripts/chaos-schedule.sh SCHEDULE=weekly

# Monthly full test
./scripts/chaos-schedule.sh SCHEDULE=monthly
```

### Automated Reporting
```bash
# Generate test report
./scripts/generate-test-report.sh
```

## Best Practices

1. **Start Small**
   - Begin with single pod failures
   - Gradually increase complexity
   - Test during low-traffic periods

2. **Monitor Continuously**
   - Watch metrics during tests
   - Have real-time dashboards ready
   - Set up alerting for test failures

3. **Document Everything**
   - Record test parameters
   - Document observed behavior
   - Track lessons learned

4. **Iterate and Improve**
   - Update runbooks based on findings
   - Improve automation
   - Refine testing procedures

## Troubleshooting

### Test Fails to Start
- Check Chaos Mesh installation
- Verify RBAC permissions
- Ensure test resources exist

### Failover Doesn't Trigger
- Check health check configuration
- Verify auto-failover is enabled
- Review failover threshold settings

### Data Inconsistency After Test
- Check replication status
- Verify backup integrity
- Run data reconciliation

### DNS Doesn't Update
- Check DNS provider configuration
- Verify health check status
- Review DNS propagation

## Emergency Procedures

If a test causes unexpected issues:

1. **Stop the test immediately**
   ```bash
   kubectl delete -f chaos/
   ```

2. **Restore normal operations**
   ```bash
   kubectl scale deployment/backend -n lumina-primary --replicas=3
   kubectl scale statefulset/postgres-master -n lumina-primary --replicas=1
   ```

3. **Notify on-call team**
   - Page incident commander
   - Create incident ticket
   - Document the issue

4. **Investigate root cause**
   - Review logs
   - Analyze metrics
   - Document findings

## Resources

- [Chaos Mesh Documentation](https://chaos-mesh.org/docs)
- [Kubernetes Chaos Engineering](https://kubernetes.io/docs/concepts/cluster-administration/chaos-engineering/)
- [Disaster Recovery Runbooks](./runbooks/)
- [Monitoring Dashboards](../grafana/dashboards/)
