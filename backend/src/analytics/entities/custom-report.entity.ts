import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('custom_reports')
@Index(['merchantId'])
export class CustomReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  merchantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'jsonb' })
  config: {
    metrics: string[];
    filters: Record<string, any>;
    groupBy: string[];
    timeRange: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'csv' | 'pdf' | 'email';
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
