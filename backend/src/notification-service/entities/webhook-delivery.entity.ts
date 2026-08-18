import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  RETRYING = 'retrying',
  FAILED = 'failed',
  DLQ = 'dlq',
}

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  webhook_id: string;

  @Column({ nullable: true })
  event_id: string;

  @Column()
  event: string;

  @Column('jsonb')
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: WebhookDeliveryStatus,
    default: WebhookDeliveryStatus.PENDING,
  })
  status: WebhookDeliveryStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ default: 5 })
  max_attempts: number;

  @Column({ nullable: true })
  last_attempted_at: Date | null;

  @Column({ nullable: true })
  next_retry_at: Date | null;

  @Column({ nullable: true })
  delivered_at: Date | null;

  @Column({ nullable: true })
  response_status: number | null;

  @Column({ nullable: true, type: 'text' })
  response_body: string | null;

  @Column({ nullable: true, type: 'text' })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
