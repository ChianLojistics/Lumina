import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ProofType {
  PAYMENT = 'payment',
  SETTLEMENT = 'settlement',
  IDENTITY = 'identity',
}

@Entity('zk_proofs')
@Index(['transactionId'])
@Index(['proofType'])
export class ZKPProof {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @Column({
    type: 'enum',
    enum: ProofType,
  })
  proofType: ProofType;

  @Column({ type: 'bytea' })
  proofData: Buffer;

  @Column({ type: 'jsonb' })
  publicInputs: Record<string, any>;

  @Column({ name: 'verification_key', length: 255 })
  verificationKey: string;

  @Column({ name: 'nullifier_hash', length: 64, unique: true })
  nullifierHash: string;

  @Column({ name: 'proof_size' })
  proofSize: number;

  @Column({ name: 'generation_time_ms' })
  generationTimeMs: number;

  @Column({ default: false })
  cached: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
