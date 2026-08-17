import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('rule_versions')
@Index(['rule_id', 'version'], { unique: true })
export class RuleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rule_id: string;

  @Column()
  version: number;

  @Column({ type: 'jsonb' })
  rule_config: Record<string, any>;

  @Column({ nullable: true })
  created_by: string;

  @Column({ type: 'text', nullable: true })
  change_description: string;

  @CreateDateColumn()
  created_at: Date;
}
