import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('nullifiers')
@Index(['nullifierHash'], { unique: true })
export class Nullifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nullifier_hash', length: 64, unique: true })
  nullifierHash: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @Column({ name: 'proof_type', length: 50 })
  proofType: string;

  @Column({ name: 'used_at' })
  usedAt: Date;

  @Column({ default: false })
  spent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
