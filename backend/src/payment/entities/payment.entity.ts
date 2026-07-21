import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum PaymentCurrency {
  BTC = 'BTC',
  ETH = 'ETH',
  USDC = 'USDC',
  XLM = 'XLM',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  payment_id: string;

  @Column()
  merchant_address: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentCurrency,
  })
  currency: PaymentCurrency;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  transaction_hash: string;

  @Column({ nullable: true })
  stellar_contract_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  expires_at: Date;
}
