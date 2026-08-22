import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  PENDING = 'pending',
}

export interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  favicon?: string;
  emailTemplate?: string;
  cssOverrides?: string;
}

export interface QuotaConfig {
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

export interface FeatureConfig {
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

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  slug: string;

  @Index({ unique: true })
  @Column({ length: 255, nullable: true })
  domain: string;

  @Column({ type: 'jsonb', default: {} })
  branding_config: BrandingConfig;

  @Column({ type: 'jsonb', default: {} })
  quota_config: QuotaConfig;

  @Column({ type: 'jsonb', default: {} })
  feature_config: FeatureConfig;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.TRIAL,
  })
  status: TenantStatus;

  @Column({ nullable: true })
  plan: string;

  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscription_renews_at: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  admin_email: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
