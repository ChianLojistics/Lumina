import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  tenant_id: string;

  @Column()
  merchant_id: string;

  @Column()
  url: string;

  @Column('simple-array')
  events: string[];

  @Column()
  secret: string;

  @Column('jsonb', { nullable: true })
  filters: {
    amount?: { min?: number; max?: number };
    currency?: string[];
    status?: string[];
  };

  @Column('jsonb', { nullable: true })
  headers: Record<string, string>;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
