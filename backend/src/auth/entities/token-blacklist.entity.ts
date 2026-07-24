import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Records the `jti` of access tokens that were invalidated before their
 * natural expiry (logout). `JwtStrategy` rejects any token whose `jti`
 * shows up here. Rows past `expires_at` are safe to prune since the token
 * itself would no longer validate anyway.
 */
@Entity('token_blacklist')
export class TokenBlacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  jti: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
