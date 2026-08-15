import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PQCryptoKey } from './pq-crypto-key.entity';

@Entity('crypto_operations')
export class CryptoOperation {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  keyId: string;

  @ManyToOne(() => PQCryptoKey)
  @JoinColumn({ name: 'keyId' })
  key?: PQCryptoKey;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  operationType: 'keygen' | 'sign' | 'verify' | 'encrypt' | 'decrypt' | 'key-exchange' | 'encapsulate' | 'decapsulate';

  @Column({ type: 'varchar', length: 50 })
  @Index()
  algorithm: string;

  @Column({ type: 'boolean' })
  quantumResistant: boolean;

  @Column({ type: 'integer', nullable: true })
  performanceMs: number;

  @Column({ type: 'integer', nullable: true })
  keySize: number;

  @Column({ type: 'integer', nullable: true })
  dataSize: number;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
