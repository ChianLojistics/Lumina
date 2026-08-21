import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('rate_limit_violations')
export class RateLimitViolationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({ type: 'inet', nullable: true })
  @Index()
  ipAddress: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  endpoint: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  policyId: string;

  @Column({ type: 'varchar', length: 50 })
  actionTaken: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  @Index()
  violatedAt: Date;
}
