import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_proofs')
@Index(['merchantId'])
@Index(['createdAt'])
export class AuditProof {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ type: 'bytea' })
  proofData: Buffer;

  @Column({ type: 'jsonb' })
  revealedFields: string[];

  @Column({ type: 'jsonb' })
  dateRange: {
    startDate: Date;
    endDate: Date;
  };

  @Column({ type: 'jsonb' })
  aggregateData: {
    totalTransactions: number;
    totalAmount: number;
    currency: string;
  };

  @Column({ name: 'merkle_root', length: 64 })
  merkleRoot: string;

  @Column({ name: 'proof_type', length: 50 })
  proofType: string;

  @Column({ name: 'generation_time_ms' })
  generationTimeMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
