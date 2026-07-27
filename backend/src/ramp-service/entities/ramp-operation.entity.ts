import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RampOperationType {
  ON_RAMP = 'on_ramp',
  OFF_RAMP = 'off_ramp',
}

export enum RampOperationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  AWAITING_KYC = 'awaiting_kyc',
  AWAITING_PAYMENT = 'awaiting_payment',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  ACH = 'ach',
  SEPA = 'sepa',
}

export enum CryptoAsset {
  USDC = 'USDC',
  XLM = 'XLM',
  BTC = 'BTC',
  ETH = 'ETH',
}

export enum Provider {
  STRIPE = 'stripe',
  MOONPAY = 'moonpay',
  BANXA = 'banxa',
}

@Entity('ramp_operations')
export class RampOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  operation_id: string;

  @Column()
  user_id: string;

  @Column({
    type: 'enum',
    enum: RampOperationType,
  })
  operation_type: RampOperationType;

  @Column({
    type: 'enum',
    enum: RampOperationStatus,
    default: RampOperationStatus.PENDING,
  })
  status: RampOperationStatus;

  @Column('decimal', { precision: 18, scale: 8 })
  fiat_amount: number;

  @Column()
  fiat_currency: string;

  @Column('decimal', { precision: 18, scale: 8 })
  crypto_amount: number;

  @Column({
    type: 'enum',
    enum: CryptoAsset,
  })
  crypto_asset: CryptoAsset;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  payment_method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: Provider,
    nullable: true,
  })
  provider: Provider;

  @Column({ nullable: true })
  provider_transaction_id: string;

  @Column({ nullable: true })
  wallet_address: string;

  @Column({ nullable: true })
  bank_account_id: string;

  @Column({ nullable: true })
  kyc_reference_id: string;

  @Column({ type: 'json', nullable: true })
  kyc_data: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  aml_data: Record<string, any>;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  fee: number;

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  exchange_rate: number;

  @Column({ nullable: true })
  failure_reason: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  webhook_received_at: Date;

  @Column({ nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  expires_at: Date;
}
