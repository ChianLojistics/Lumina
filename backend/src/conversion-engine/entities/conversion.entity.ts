import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ConversionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  RETRYING = 'retrying',
  FAILED = 'failed',
}

@Entity('conversions')
export class Conversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  payment_id: string;

  @Column()
  from_asset: string;

  @Column()
  to_asset: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: number;

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  converted_amount: number | null;

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  rate: number | null;

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  fee_amount: number | null;

  @Column({ nullable: true })
  price_source: string | null;

  @Column({
    type: 'enum',
    enum: ConversionStatus,
    default: ConversionStatus.PENDING,
  })
  status: ConversionStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ default: 3 })
  max_attempts: number;

  @Column({ nullable: true })
  next_retry_at: Date | null;

  @Column({ nullable: true, type: 'text' })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
