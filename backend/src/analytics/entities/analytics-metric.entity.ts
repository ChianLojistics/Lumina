import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_metrics')
@Index(['merchantId', 'metricName', 'timestamp'])
export class AnalyticsMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  merchantId: string;

  @Column({ name: 'metric_name', type: 'varchar', length: 50 })
  metricName: string;

  @Column({ name: 'metric_value', type: 'decimal', precision: 36, scale: 18 })
  metricValue: number;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: Record<string, any>;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamp' })
  timestamp: Date;
}
