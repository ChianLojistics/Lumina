import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('rule_evaluations')
@Index(['rule_id'])
@Index(['transaction_id'])
export class RuleEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rule_id: string;

  @Column()
  transaction_id: string;

  @Column()
  matched: boolean;

  @Column({ nullable: true })
  merchant_id: string;

  @Column({ type: 'int', nullable: true })
  evaluation_time_ms: number;

  @Column({ type: 'jsonb', nullable: true })
  evaluation_context: Record<string, any>;

  @CreateDateColumn()
  evaluated_at: Date;
}
