# Multi-Tenant Architecture for Lumina

## Overview

Lumina has been transformed from a single-tenant application to a true multi-tenant SaaS platform with strict data isolation, tenant-specific configurations, custom branding, and resource quotas. This enables white-label solutions for enterprise customers while maintaining security and performance.

## Architecture Strategy

### Data Isolation Approach: Row-Level Security (RLS)

We use **PostgreSQL Row-Level Security (RLS)** as our primary isolation strategy. This provides:

- **Cost-effective**: Single database instance shared across tenants
- **Strong isolation**: Database-level enforcement prevents data leakage
- **Performance**: Efficient queries with proper indexing
- **Flexibility**: Easy to implement and maintain

### Tenant Identification

Tenants are identified through multiple methods (in order of priority):

1. **Subdomain**: `tenant.example.com`
2. **Custom Domain**: `tenant-brand.com`
3. **Header**: `X-Tenant-ID` or `X-Tenant-Slug`
4. **Path Parameter**: `/api/tenants/:id`
5. **Query Parameter**: `?tenantId=xxx` (for testing)

## Data Model

### Core Tenant Tables

#### `tenants`
Stores tenant configuration and metadata:
- `id`: UUID primary key
- `name`: Tenant display name
- `slug`: URL-safe identifier (unique)
- `domain`: Custom domain (optional, unique)
- `branding_config`: JSONB for custom branding
- `quota_config`: JSONB for resource limits
- `feature_config`: JSONB for feature flags
- `status`: active, suspended, trial, pending
- `plan`: Subscription plan
- `trial_ends_at`: Trial period end date
- `subscription_renews_at`: Renewal date

#### `tenant_users`
Maps users to tenants with roles:
- `id`: UUID primary key
- `tenant_id`: Reference to tenant
- `user_id`: Reference to user
- `role`: owner, admin, member, viewer
- `is_active`: User status in tenant
- `invited_at`: Invitation timestamp
- `joined_at`: Join timestamp
- `invited_by`: Who invited the user

#### `tenant_usage`
Tracks resource usage per tenant:
- `id`: UUID primary key
- `tenant_id`: Reference to tenant
- `resource_type`: api_calls, transactions, storage, webhooks, custom_domains
- `daily_count`: Daily usage counter
- `hourly_count`: Hourly usage counter
- `monthly_count`: Monthly usage counter
- `total_count`: Lifetime usage counter
- `current_value`: Current storage usage in bytes
- `daily_reset_at`: Daily reset timestamp
- `hourly_reset_at`: Hourly reset timestamp
- `monthly_reset_at`: Monthly reset timestamp

#### `tenant_audit`
Audit log for all tenant operations:
- `id`: UUID primary key
- `tenant_id`: Reference to tenant
- `actor_id`: Who performed the action
- `actor_email`: Email of actor
- `action`: Specific action performed
- `resource`: Resource type affected
- `resource_id`: ID of affected resource
- `old_values`: Previous state (JSONB)
- `new_values`: New state (JSONB)
- `description`: Human-readable description
- `ip_address`: Actor's IP
- `user_agent`: Actor's user agent
- `is_sensitive`: Whether action is sensitive

### Existing Tables with Tenant Isolation

All existing tables now include `tenant_id` for isolation:
- `users`
- `payments`
- `merchants`
- `api_keys`
- `webhooks`
- `webhook_deliveries`
- `conversions`
- `crypto_operations`
- `ramp_operations`
- `bank_accounts`
- `kyc_records`
- `ledger_entries`
- `reconciliation_reports`
- `fraud_rules`
- `rule_evaluations`
- `rule_analytics`
- `rule_versions`
- `anomaly_alerts`
- `analytics_metrics`
- `customer_analytics`
- `revenue_forecasts`
- `custom_reports`
- `zkp_proofs`
- `nullifiers`
- `audit_proofs`
- `rate_limit_policies`
- `rate_limit_violations`

## API Endpoints

### Tenant Management

- `POST /api/tenants` - Create new tenant (admin only)
- `GET /api/tenants` - List all tenants (admin only)
- `GET /api/tenants/:id` - Get tenant details
- `PUT /api/tenants/:id` - Update tenant (admin only)
- `DELETE /api/tenants/:id` - Delete tenant (admin only)

### User Management

- `POST /api/tenants/:id/users` - Add user to tenant
- `DELETE /api/tenants/:id/users/:userId` - Remove user from tenant

### Quota Management

- `GET /api/tenants/:id/quotas` - Get quota usage
- `PUT /api/tenants/:id/quotas` - Update quotas (admin only)

### Branding

- `GET /api/tenants/:id/branding` - Get branding configuration
- `PUT /api/tenants/:id/branding` - Update branding

### Audit Logs

- `GET /api/tenants/:id/audit` - Get audit logs

## Configuration

### Branding Configuration

```typescript
interface BrandingConfig {
  logo?: string;           // URL or base64
  primaryColor?: string;   // Hex color
  secondaryColor?: string; // Hex color
  customDomain?: string;   // Custom domain
  favicon?: string;        // URL or base64
  emailTemplate?: string;  // Custom email template
  cssOverrides?: string;    // Custom CSS
}
```

### Quota Configuration

```typescript
interface QuotaConfig {
  apiCalls: {
    daily: number;
    hourly: number;
  };
  transactions: {
    daily: number;
    monthly: number;
  };
  storage: {
    maxBytes: number;
  };
  webhooks: {
    maxEndpoints: number;
  };
  customDomains: {
    maxDomains: number;
  };
}
```

### Feature Configuration

```typescript
interface FeatureConfig {
  payments: boolean;
  subscriptions: boolean;
  escrow: boolean;
  paymentSplits: boolean;
  onRamp: boolean;
  offRamp: boolean;
  advancedAnalytics: boolean;
  customWebhooks: boolean;
  prioritySupport: boolean;
}
```

## Security

### Row-Level Security Policies

PostgreSQL RLS policies ensure that:
- All queries automatically filter by `tenant_id`
- No data can be accessed across tenants
- Policies are enforced at the database level
- Application-level bypass is impossible

### Tenant Middleware

The `TenantMiddleware`:
- Identifies tenant from request
- Sets tenant context in request object
- Validates tenant status
- Sets PostgreSQL session variable for RLS

### Guards

- `TenantGuard`: Ensures tenant context is present
- `TenantRoleGuard`: Enforces tenant-specific roles

### Audit Logging

All tenant operations are logged with:
- Actor information
- Timestamp
- Action performed
- Resource affected
- State changes
- IP address and user agent

## Migration

### Database Migration

Run the RLS migration to enable row-level security:

```bash
psql -U lumina -d lumina -f backend/src/tenant/migrations/enable-rls.sql
```

### Data Migration

For existing single-tenant data:

1. Create a default tenant
2. Migrate existing data to the default tenant
3. Enable RLS policies
4. Test data isolation

## Performance Considerations

### Indexing

All `tenant_id` columns are indexed for optimal query performance.

### Connection Pooling

Consider using connection pooling per tenant for high-throughput scenarios.

### Caching

Tenant configurations are cached in Redis for fast access.

### Query Optimization

- Always include `tenant_id` in WHERE clauses
- Use composite indexes on `(tenant_id, other_column)`
- Monitor query performance per tenant

## Testing

### Unit Tests

- Tenant identification logic
- Quota enforcement
- Audit logging
- Branding application

### Integration Tests

- Data isolation between tenants
- Cross-tenant access prevention
- Middleware functionality
- RLS policy enforcement

### Performance Tests

- Multi-tenant query performance
- Concurrent tenant operations
- Quota enforcement overhead

## Deployment

### Environment Variables

```env
# Multi-tenant settings
MULTI_TENANT_ENABLED=true
DEFAULT_TENANT_ID=
DEFAULT_TENANT_SLUG=
```

### Database Setup

1. Ensure PostgreSQL 15+ is installed
2. Run RLS migration
3. Create default tenant
4. Verify RLS policies

### Monitoring

Monitor:
- Tenant-specific metrics
- Quota usage per tenant
- RLS policy performance
- Cross-tenant access attempts

## Best Practices

### For Developers

1. **Always use tenant context**: Access tenant via `req.tenant`
2. **Never bypass RLS**: Don't disable RLS in production
3. **Log all tenant operations**: Use audit logging
4. **Validate quotas**: Check quotas before resource-intensive operations
5. **Use tenant-specific caching**: Include tenant_id in cache keys

### For Operations

1. **Monitor quota usage**: Set up alerts for quota limits
2. **Regular audits**: Review audit logs for suspicious activity
3. **Backup per tenant**: Implement tenant-specific backup strategies
4. **Test isolation**: Regularly test data isolation
5. **Plan scaling**: Design for horizontal scaling with multiple tenants

## Future Enhancements

### Planned Features

- Tenant-specific database schemas (for compliance requirements)
- Advanced quota management with tiered pricing
- Tenant analytics dashboard
- Automated tenant onboarding
- Tenant migration tools
- Per-tenant backup/restore
- Multi-region tenant deployment

### Compliance

- GDPR-compliant data export per tenant
- SOC 2 Type II compliance features
- HIPAA-compliant tenant isolation
- Data residency controls

## Troubleshooting

### Common Issues

**Tenant not found**: Check tenant identification methods and ensure tenant exists

**RLS blocking queries**: Verify `app.current_tenant_id` is set correctly

**Quota exceeded**: Check quota configuration and usage

**Cross-tenant data leak**: Verify RLS policies are enabled and working

### Debug Mode

Enable debug logging for tenant operations:

```env
LOG_LEVEL=debug
TENANT_DEBUG=true
```

## Support

For issues or questions about multi-tenant architecture:
- Review this documentation
- Check audit logs
- Verify RLS policies
- Test with PostgreSQL directly
