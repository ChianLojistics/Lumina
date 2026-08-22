import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AnomalyStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
}

export enum AnomalyType {
  REVENUE_SPIKE = 'revenue_spike',
  REVENUE_DROP = 'revenue_drop',
  SUCCESS_RATE_DROP = 'success_rate_drop',
  UNUSUAL_VOLUME = 'unusual_volume',
  GEOGRAPHIC_ANOMALY = 'geographic_anomaly',
  PAYMENT_METHOD_ANOMALY = 'payment_method_anomaly',
  FRAUD_PATTERN = 'fraud_pattern',
}

@Entity('anomaly_alerts')
@Index(['merchantId', 'status'])
@Index(['merchantId', 'severity'])
export class AnomalyAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  merchantId: string;

  @Column({
    type: 'enum',
    enum: AnomalyType,
  })
  type: AnomalyType;

  @Column({
    type: 'enum',
    enum: AnomalySeverity,
  })
  severity: AnomalySeverity;

  @Column({
    type: 'enum',
    enum: AnomalyStatus,
    default: AnomalyStatus.OPEN,
  })
  status: AnomalyStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  metadata: {
    metricName: string;
    expectedValue: number;
    actualValue: number;
    deviation: number;
    threshold: number;
    timestamp: string;
    dimensions?: Record<string, any>;
  };

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @Column({ name: 'acknowledged_by', type: 'uuid', nullable: true })
  acknowledgedBy: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
