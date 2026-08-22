import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('customer_analytics')
@Index(['merchantId', 'customerEmail'])
@Index(['merchantId', 'cohort'])
export class CustomerAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  merchantId: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  customerEmail: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cohort: string;

  @Column({ name: 'total_transactions', type: 'int', default: 0 })
  totalTransactions: number;

  @Column({ name: 'total_spent', type: 'decimal', precision: 36, scale: 18, default: 0 })
  totalSpent: number;

  @Column({ name: 'avg_order_value', type: 'decimal', precision: 36, scale: 18, nullable: true })
  avgOrderValue: number;

  @Column({ name: 'first_purchase', type: 'timestamp', nullable: true })
  firstPurchase: Date;

  @Column({ name: 'last_purchase', type: 'timestamp', nullable: true })
  lastPurchase: Date;

  @Column({ type: 'jsonb', nullable: true })
  segments: string[];

  @Column({ name: 'churn_probability', type: 'decimal', precision: 5, scale: 2, nullable: true })
  churnProbability: number;

  @CreateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
