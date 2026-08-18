import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('rule_analytics')
@Index(['rule_id'])
@Index(['date'])
export class RuleAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rule_id: string;

  @Column({ nullable: true })
  merchant_id: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: 0 })
  total_evaluations: number;

  @Column({ default: 0 })
  total_matches: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  match_rate: number;

  @Column({ type: 'int', default: 0 })
  avg_evaluation_time_ms: number;

  @CreateDateColumn()
  created_at: Date;
}
