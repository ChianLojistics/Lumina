import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UsageResourceType {
  API_CALLS = 'api_calls',
  TRANSACTIONS = 'transactions',
  STORAGE = 'storage',
  WEBHOOKS = 'webhooks',
  CUSTOM_DOMAINS = 'custom_domains',
}

@Entity('tenant_usage')
export class TenantUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: UsageResourceType,
  })
  resource_type: UsageResourceType;

  @Column({ type: 'bigint', default: 0 })
  daily_count: number;

  @Column({ type: 'bigint', default: 0 })
  hourly_count: number;

  @Column({ type: 'bigint', default: 0 })
  monthly_count: number;

  @Column({ type: 'bigint', default: 0 })
  total_count: number;

  @Column({ type: 'bigint', default: 0 })
  current_value: number; // For storage in bytes

  @Column({ type: 'timestamp', nullable: true })
  daily_reset_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  hourly_reset_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  monthly_reset_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
