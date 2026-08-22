import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('revenue_forecasts')
@Index(['merchantId', 'forecastDate'])
export class RevenueForecast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  merchantId: string;

  @Column({ name: 'forecast_date', type: 'date' })
  forecastDate: Date;

  @Column({ name: 'predicted_revenue', type: 'decimal', precision: 36, scale: 18 })
  predictedRevenue: number;

  @Column({ name: 'confidence_lower', type: 'decimal', precision: 36, scale: 18, nullable: true })
  confidenceLower: number;

  @Column({ name: 'confidence_upper', type: 'decimal', precision: 36, scale: 18, nullable: true })
  confidenceUpper: number;

  @Column({ name: 'model_version', type: 'varchar', length: 50, nullable: true })
  modelVersion: string;

  @Column({ type: 'jsonb', nullable: true })
  scenario: 'optimistic' | 'pessimistic' | 'baseline';

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
