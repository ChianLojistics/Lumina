import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('pq_crypto_keys')
export class PQCryptoKey {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  algorithm: string;

  @Column({ type: 'integer' })
  strength: number;

  @Column({ type: 'enum', enum: ['key-exchange', 'signature', 'encryption'] })
  @Index()
  keyType: 'key-exchange' | 'signature' | 'encryption';

  @Column({ type: 'bytea' })
  publicKey: Buffer;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hsmId: string;

  @Column({ type: 'enum', enum: ['active', 'deprecated', 'revoked'], default: 'active' })
  @Index()
  status: 'active' | 'deprecated' | 'revoked';

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId: string;

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
