import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ApiKeyPermission } from '../enums/api-key-permission.enum';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  tenant_id: string;

  @Index()
  @Column()
  merchant_id: string;

  @Column({ nullable: true })
  name: string;

  @Column()
  key_prefix: string;

  @Index({ unique: true })
  @Column()
  key_hash: string;

  @Column({ type: 'enum', enum: ApiKeyPermission, array: true, default: [ApiKeyPermission.READ] })
  permissions: ApiKeyPermission[];

  @Column({ default: 0 })
  usage_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
