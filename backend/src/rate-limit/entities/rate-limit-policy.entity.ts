import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RateLimitAlgorithm {
  TOKEN_BUCKET = 'token-bucket',
  SLIDING_WINDOW = 'sliding-window',
  LEAKY_BUCKET = 'leaky-bucket',
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstCapacity: number;
  windowSize: number;
}

export interface RateLimitScope {
  users: string[];
  tiers: string[];
  endpoints: string[];
}

export interface RateLimitConditions {
  systemLoad?: number;
  timeOfDay?: string[];
}

export interface RateLimitActions {
  throttle: boolean;
  challenge: boolean;
  block: boolean;
}

@Entity('rate_limit_policies')
export class RateLimitPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: RateLimitAlgorithm,
  })
  algorithm: RateLimitAlgorithm;

  @Column({ type: 'jsonb' })
  config: RateLimitConfig;

  @Column({ type: 'jsonb' })
  scope: RateLimitScope;

  @Column({ type: 'jsonb', nullable: true })
  conditions?: RateLimitConditions;

  @Column({ type: 'jsonb' })
  actions: RateLimitActions;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
