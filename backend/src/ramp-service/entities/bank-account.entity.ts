import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum BankAccountStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  DISABLED = 'disabled',
}

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
}

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  account_id: string;

  @Column()
  user_id: string;

  @Column()
  account_holder_name: string;

  @Column()
  account_number_last4: string;

  @Column()
  routing_number: string;

  @Column()
  bank_name: string;

  @Column()
  country: string;

  @Column()
  currency: string;

  @Column({
    type: 'enum',
    enum: BankAccountType,
  })
  account_type: BankAccountType;

  @Column({
    type: 'enum',
    enum: BankAccountStatus,
    default: BankAccountStatus.PENDING,
  })
  status: BankAccountStatus;

  @Column({ nullable: true })
  stripe_bank_account_id: string;

  @Column({ nullable: true })
  plaid_account_id: string;

  @Column({ type: 'json', nullable: true })
  verification_data: Record<string, any>;

  @Column({ default: false })
  is_default: boolean;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  daily_withdrawal_limit: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  monthly_withdrawal_limit: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  current_daily_withdrawn: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  current_monthly_withdrawn: number;

  @Column({ nullable: true })
  last_used_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
