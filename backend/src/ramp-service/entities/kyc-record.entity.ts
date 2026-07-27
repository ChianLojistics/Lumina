import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum KycStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum KycProvider {
  STRIPE_IDENTITY = 'stripe_identity',
  SUMSUB = 'sumsub',
  COMPLYADVANTAGE = 'complyadvantage',
}

@Entity('kyc_records')
export class KycRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  kyc_id: string;

  @Column()
  user_id: string;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  status: KycStatus;

  @Column({
    type: 'enum',
    enum: KycProvider,
  })
  provider: KycProvider;

  @Column({ nullable: true })
  provider_reference_id: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  date_of_birth: Date;

  @Column({ nullable: true })
  nationality: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  document_type: string;

  @Column({ nullable: true })
  document_number: string;

  @Column({ nullable: true })
  document_front_url: string;

  @Column({ nullable: true })
  document_back_url: string;

  @Column({ nullable: true })
  selfie_url: string;

  @Column({ type: 'json', nullable: true })
  provider_response: Record<string, any>;

  @Column({ nullable: true })
  rejection_reason: string;

  @Column({ nullable: true })
  approved_at: Date;

  @Column({ nullable: true })
  expires_at: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
