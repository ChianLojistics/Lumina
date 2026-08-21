# Security Incident Runbook

## Overview
This runbook handles security incidents including unauthorized access, data breaches, and malicious attacks.

## Incident Classification

| Severity | Description | Examples |
|----------|-------------|----------|
| P0 - Critical | Active attack, data exfiltration | Ransomware, active breach |
| P1 - High | Security breach confirmed | Unauthorized access, data leak |
| P2 - Medium | Potential security issue | Suspicious activity, vulnerability |
| P3 - Low | Security concern | Failed login attempts, policy violation |

## Immediate Response (0-15 minutes)

### Phase 1: Containment

1. **Activate Incident Response Team**
   ```bash
   # Notify security team
   # Send PagerDuty alert
   # Create incident ticket
   # Lock down security credentials
   ```

2. **Isolate Affected Systems**
   ```bash
   # Stop affected services
   kubectl scale deployment/backend -n lumina-primary --replicas=0
   
   # Enable maintenance mode
   kubectl set env deployment/backend -n lumina-primary MAINTENANCE_MODE=true
   
   # Block suspicious IPs
   kubectl annotate namespace lumina-primary "net.beta.kubernetes.io/network-policy=deny"
   ```

3. **Preserve Evidence**
   ```bash
   # Take system snapshots
   kubectl get pods -n lumina-primary -o yaml > /tmp/pods_snapshot.yaml
   
   # Capture logs
   kubectl logs --all -n lumina-primary > /tmp/all_logs.txt
   
   # Save to secure location
   aws s3 cp /tmp/pods_snapshot.yaml s3://lumina-security-evidence/
   aws s3 cp /tmp/all_logs.txt s3://lumina-security-evidence/
   ```

4. **Change Credentials**
   ```bash
   # Rotate database passwords
   kubectl delete secret postgres-secret -n lumina-primary
   kubectl apply -f k8s/primary/postgres-secret.yaml
   
   # Rotate API keys
   # Update JWT secrets
   # Invalidate sessions
   ```

### Phase 2: Assessment (15-60 minutes)

1. **Determine Scope**
   ```bash
   # Check affected systems
   kubectl get pods -n lumina-primary --field-selector=status.phase!=Running
   
   # Check for unauthorized access
   kubectl auth can-i --list --all-namespaces
   
   # Review recent changes
   kubectl get events -n lumina-primary --sort-by='.lastTimestamp'
   ```

2. **Analyze Logs**
   ```bash
   # Check for suspicious activity
   kubectl logs deployment/backend -n lumina-primary | grep -i "unauthorized\|forbidden\|error"
   
   # Check authentication logs
   kubectl logs deployment/backend -n lumina-primary | grep -i "auth\|login\|token"
   
   # Check for data access
   kubectl logs deployment/backend -n lumina-primary | grep -i "select\|update\|delete"
   ```

3. **Identify Attack Vector**
   - Check for common vulnerabilities
   - Review access logs
   - Analyze network traffic
   - Check for malware signatures

### Phase 3: Eradication (60-120 minutes)

1. **Remove Threats**
   ```bash
   # Remove malicious pods
   kubectl delete pod <suspicious-pod> -n lumina-primary --force --grace-period=0
   
   # Clean compromised data
   kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
   DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '1 hour';
   "
   
   # Remove backdoors
   kubectl patch deployment/backend -n lumina-primary -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","securityContext":{"runAsNonRoot":true}}]}}}}'
   ```

2. **Patch Vulnerabilities**
   ```bash
   # Update images
   kubectl set image deployment/backend -n lumina-primary backend=lumina-backend:secure
   
   # Update configurations
   kubectl apply -f k8s/security-hardening.yaml
   
   # Restart services
   kubectl rollout restart deployment/backend -n lumina-primary
   ```

3. **Verify Cleanup**
   ```bash
   # Scan for remaining threats
   kubectl run security-scan --image=aquasec/trivy:latest -- scan lumina-backend:latest
   
   # Check for suspicious processes
   kubectl exec -n lumina-primary backend-0 -- ps aux
   ```

### Phase 4: Recovery (120-180 minutes)

1. **Restore from Clean Backup**
   ```bash
   # Verify backup integrity
   ./scripts/verify-backup.sh
   
   # Restore from pre-incident backup
   ./scripts/restore-backup.sh lumina_backup_PRE_INCIDENT.sql.gz lumina-primary
   ```

2. **Gradual Restoration**
   ```bash
   # Start services in read-only mode
   kubectl set env deployment/backend -n lumina-primary READ_ONLY_MODE=true
   kubectl scale deployment/backend -n lumina-primary --replicas=1
   
   # Monitor for suspicious activity
   kubectl logs -f deployment/backend -n lumina-primary
   ```

3. **Full Restoration**
   ```bash
   # Disable read-only mode
   kubectl set env deployment/backend -n lumina-primary READ_ONLY_MODE=false
   
   # Scale to normal capacity
   kubectl scale deployment/backend -n lumina-primary --replicas=3
   ```

## Common Attack Scenarios

### Scenario 1: Unauthorized Access

**Detection**
- Failed login attempts spike
- Unusual access patterns
- Privilege escalation attempts

**Response**
```bash
# Block suspicious IPs
kubectl annotate namespace lumina-primary "networking.k8s.io/deny-cidr=SUSPICIOUS_IP/32"

# Lock accounts
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
UPDATE users SET lockout_until = NOW() + INTERVAL '24 hours' 
WHERE id IN (SELECT user_id FROM failed_logins WHERE count > 10);
"

# Enable MFA
kubectl set env deployment/backend -n lumina-primary MFA_REQUIRED=true
```

### Scenario 2: Data Exfiltration

**Detection**
- Unusual data export patterns
- Large outbound transfers
- Sensitive data access

**Response**
```bash
# Block outbound traffic
kubectl apply -f k8s/network-policy-deny-egress.yaml

# Audit data access
kubectl exec -n lumina-primary postgres-master-0 -- psql -U lumina -c "
SELECT * FROM audit_log 
WHERE table_name IN ('users', 'payments', 'transactions')
  AND operation = 'SELECT'
  AND timestamp > NOW() - INTERVAL '1 hour';
"

# Notify data subjects
# Initiate breach notification process
```

### Scenario 3: Ransomware

**Detection**
- File encryption activity
- Ransom notes
- System unavailability

**Response**
```bash
# Immediate isolation
kubectl cordon <affected-nodes>
kubectl drain <affected-nodes> --ignore-daemonsets --delete-emptydir-data

# Do not pay ransom
# Restore from offline backups
# Engage law enforcement
```

### Scenario 4: DDoS Attack

**Detection**
- Traffic spike
- Resource exhaustion
- Service unavailability

**Response**
```bash
# Enable rate limiting
kubectl apply -f k8s/rate-limiting.yaml

# Scale up resources
kubectl scale deployment/backend -n lumina-primary --replicas=20

# Enable CDN protection
# Implement CAPTCHA
# Block attack IPs
```

## Legal and Compliance Requirements

### Breach Notification
- GDPR: 72 hours
- PCI DSS: Immediate
- State laws: Varies (24-72 hours)
- Industry regulations: Specific timelines

### Evidence Preservation
- Maintain chain of custody
- Document all actions
- Preserve logs for 90+ days
- Secure evidence storage

### Regulatory Reporting
- Notify relevant authorities
- File required reports
- Cooperate with investigations
- Document compliance efforts

## Post-Incident Activities

### Documentation
1. **Incident Report**
   - Timeline
   - Impact assessment
   - Root cause analysis
   - Actions taken

2. **Lessons Learned**
   - What worked well
   - What could be improved
   - Process gaps
   - Training needs

3. **Security Improvements**
   - Implement recommendations
   - Update security policies
   - Enhance monitoring
   - Improve defenses

### Communication
1. **Internal**
   - Executive team
   - Engineering team
   - Legal/compliance
   - HR (if insider threat)

2. **External**
   - Affected customers
   - Regulatory bodies
   - Law enforcement
   - Public statement (if needed)

### Prevention Measures
1. **Technical**
   - Implement MFA
   - Enhance monitoring
   - Regular security audits
   - Penetration testing

2. **Process**
   - Security training
   - Access reviews
   - Incident response drills
   - Policy updates

## Escalation Contacts

| Role | Contact | Trigger |
|------|---------|---------|
| CISO | [Contact] | All security incidents |
| CTO | [Contact] | P0/P1 incidents |
| Legal Counsel | [Contact] | P0/P1 incidents |
| Law Enforcement | [Contact] | P0 incidents |
| PR Team | [Contact] | Public incidents |

## Related Runbooks
- [Data Loss Incident](./04-data-loss.md)
- [Region Failover](./01-region-failover.md)
- [Service Degradation](./05-service-degradation.md)
