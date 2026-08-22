-- Multi-tenant Row-Level Security Migration for Lumina
-- This script enables PostgreSQL Row-Level Security (RLS) for tenant isolation

-- Enable RLS on all tenant-isolated tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ramp_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE zkp_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nullifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies
-- These policies ensure that users can only access data belonging to their tenant

-- Users table policy
CREATE POLICY tenant_isolation_users ON users
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID 
    OR tenant_id IS NULL  -- Allow system users
  );

-- Payments table policy
CREATE POLICY tenant_isolation_payments ON payments
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Merchants table policy
CREATE POLICY tenant_isolation_merchants ON merchants
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- API Keys table policy
CREATE POLICY tenant_isolation_api_keys ON api_keys
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Webhooks table policy
CREATE POLICY tenant_isolation_webhooks ON webhooks
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Webhook deliveries table policy
CREATE POLICY tenant_isolation_webhook_deliveries ON webhook_deliveries
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Conversions table policy
CREATE POLICY tenant_isolation_conversions ON conversions
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Crypto operations table policy
CREATE POLICY tenant_isolation_crypto_operations ON crypto_operations
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Ramp operations table policy
CREATE POLICY tenant_isolation_ramp_operations ON ramp_operations
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Bank accounts table policy
CREATE POLICY tenant_isolation_bank_accounts ON bank_accounts
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- KYC records table policy
CREATE POLICY tenant_isolation_kyc_records ON kyc_records
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Ledger entries table policy
CREATE POLICY tenant_isolation_ledger_entries ON ledger_entries
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Reconciliation reports table policy
CREATE POLICY tenant_isolation_reconciliation_reports ON reconciliation_reports
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Fraud rules table policy
CREATE POLICY tenant_isolation_fraud_rules ON fraud_rules
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Rule evaluations table policy
CREATE POLICY tenant_isolation_rule_evaluations ON rule_evaluations
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Rule analytics table policy
CREATE POLICY tenant_isolation_rule_analytics ON rule_analytics
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Rule versions table policy
CREATE POLICY tenant_isolation_rule_versions ON rule_versions
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Anomaly alerts table policy
CREATE POLICY tenant_isolation_anomaly_alerts ON anomaly_alerts
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Analytics metrics table policy
CREATE POLICY tenant_isolation_analytics_metrics ON analytics_metrics
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Customer analytics table policy
CREATE POLICY tenant_isolation_customer_analytics ON customer_analytics
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Revenue forecasts table policy
CREATE POLICY tenant_isolation_revenue_forecasts ON revenue_forecasts
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Custom reports table policy
CREATE POLICY tenant_isolation_custom_reports ON custom_reports
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- ZKP proofs table policy
CREATE POLICY tenant_isolation_zkp_proofs ON zkp_proofs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Nullifiers table policy
CREATE POLICY tenant_isolation_nullifiers ON nullifiers
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Audit proofs table policy
CREATE POLICY tenant_isolation_audit_proofs ON audit_proofs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Rate limit policies table policy
CREATE POLICY tenant_isolation_rate_limit_policies ON rate_limit_policies
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Rate limit violations table policy
CREATE POLICY tenant_isolation_rate_limit_violations ON rate_limit_violations
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
  );

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to application user
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO lumina;
GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO lumina;

-- Create indexes for tenant_id columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_merchants_tenant_id ON merchants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant_id ON webhook_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversions_tenant_id ON conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crypto_operations_tenant_id ON crypto_operations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ramp_operations_tenant_id ON ramp_operations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant_id ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kyc_records_tenant_id ON kyc_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_id ON ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_reports_tenant_id ON reconciliation_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_tenant_id ON fraud_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rule_evaluations_tenant_id ON rule_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rule_analytics_tenant_id ON rule_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rule_versions_tenant_id ON rule_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_tenant_id ON anomaly_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_tenant_id ON analytics_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_tenant_id ON customer_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_tenant_id ON revenue_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_tenant_id ON custom_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_zkp_proofs_tenant_id ON zkp_proofs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nullifiers_tenant_id ON nullifiers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_proofs_tenant_id ON audit_proofs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_policies_tenant_id ON rate_limit_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_tenant_id ON rate_limit_violations(tenant_id);
