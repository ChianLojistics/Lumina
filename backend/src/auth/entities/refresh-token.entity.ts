import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  user_id: string;

  @Index({ unique: true })
  @Column()
  jti: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  replaced_by_jti: string;

  @CreateDateColumn()
  created_at: Date;
}
