import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('webhook_dlq')
export class WebhookDLQ {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  webhook_id: string;

  @Column({ nullable: true })
  delivery_id: string;

  @Column({ nullable: true })
  event_id: string;

  @Column()
  event: string;

  @Column('jsonb')
  payload: Record<string, any>;

  @Column({ nullable: true, type: 'text' })
  error_message: string | null;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn()
  failed_at: Date;

  @Column({ nullable: true })
  last_attempt_at: Date | null;
}
