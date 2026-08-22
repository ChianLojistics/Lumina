import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  tenant_id: string;

  @Column({ unique: true })
  stellar_address: string;

  @Column()
  business_name: string;

  @Column({ nullable: true })
  email: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  usdc_balance: number;

  @Column({ nullable: true })
  api_key: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
