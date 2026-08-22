import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  TENANT_CREATED = 'tenant_created',
  TENANT_UPDATED = 'tenant_updated',
  TENANT_DELETED = 'tenant_deleted',
  TENANT_SUSPENDED = 'tenant_suspended',
  TENANT_RESTORED = 'tenant_restored',
  USER_ADDED = 'user_added',
  USER_REMOVED = 'user_removed',
  USER_ROLE_CHANGED = 'user_role_changed',
  QUOTA_UPDATED = 'quota_updated',
  BRANDING_UPDATED = 'branding_updated',
  FEATURE_CONFIG_UPDATED = 'feature_config_updated',
  SETTINGS_UPDATED = 'settings_updated',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  WEBHOOK_REGISTERED = 'webhook_registered',
  WEBHOOK_DELETED = 'webhook_deleted',
}

export enum AuditResource {
  TENANT = 'tenant',
  USER = 'user',
  QUOTA = 'quota',
  BRANDING = 'branding',
  FEATURE = 'feature',
  SETTINGS = 'settings',
  API_KEY = 'api_key',
  WEBHOOK = 'webhook',
}

@Entity('tenant_audit')
export class TenantAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenant_id: string;

  @Column()
  actor_id: string;

  @Column({ nullable: true })
  actor_email: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResource,
  })
  resource: AuditResource;

  @Column({ nullable: true })
  resource_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_values: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  new_values: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ default: false })
  is_sensitive: boolean;

  @CreateDateColumn()
  created_at: Date;
}
