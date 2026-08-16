import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('ledger_entries')
@Index(['transactionId'])
@Index(['service', 'timestamp'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  entryId: string;

  @Column({ type: 'bigint' })
  timestamp: number;

  @Column({ length: 50 })
  service: string;

  @Column({ length: 50 })
  operation: string;

  @Column({ length: 255 })
  transactionId: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'text' })
  signature: string;

  @Column({ length: 64 })
  previousHash: string;

  @Column({ type: 'text', nullable: true })
  merkleProof: string;

  @CreateDateColumn()
  createdAt: Date;
}
