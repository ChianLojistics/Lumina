import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum RulePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('fraud_rules')
@Index(['merchant_id', 'enabled'])
@Index(['enabled'])
export class FraudRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  merchant_id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  rule_config: Record<string, any>;

  @Column({ default: true })
  enabled: boolean;

  @Column({
    type: 'enum',
    enum: RulePriority,
    default: RulePriority.MEDIUM,
  })
  priority: RulePriority;

  @Column({ default: 1 })
  version: number;

  @Column({ nullable: true })
  created_by: string;

  @Column({ nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
