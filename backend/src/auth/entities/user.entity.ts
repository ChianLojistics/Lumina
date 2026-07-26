import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Role } from '../enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  password_hash: string;

  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER })
  role: Role;

  @Column({ nullable: true })
  full_name: string;

  @Column({ nullable: true, unique: true })
  merchant_id: string;

  @Column({ default: false })
  is_email_verified: boolean;

  @Column({ nullable: true })
  email_verification_token_hash: string;

  @Column({ type: 'timestamp', nullable: true })
  email_verification_expires_at: Date;

  @Column({ nullable: true })
  password_reset_token_hash: string;

  @Column({ type: 'timestamp', nullable: true })
  password_reset_expires_at: Date;

  @Column({ nullable: true })
  two_factor_secret: string;

  @Column({ default: false })
  two_factor_enabled: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
