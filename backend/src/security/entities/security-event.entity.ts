import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { VulnerabilitySeverity } from './vulnerability.entity';

export enum SecurityEventType {
  SCAN_INGESTED = 'SCAN_INGESTED',
  VULNERABILITY_DETECTED = 'VULNERABILITY_DETECTED',
  VULNERABILITY_ASSIGNED = 'VULNERABILITY_ASSIGNED',
  VULNERABILITY_RESOLVED = 'VULNERABILITY_RESOLVED',
  VULNERABILITY_IGNORED = 'VULNERABILITY_IGNORED',
}

@Entity('security_events')
@Index(['event_type'])
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SecurityEventType })
  event_type: SecurityEventType;

  @Column({ type: 'enum', enum: VulnerabilitySeverity, nullable: true })
  severity: VulnerabilitySeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;
}
