import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { User } from '../entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticationException } from '../../common/exceptions';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const ACCESS_TOKEN_EXPIRY = (process.env.JWT_ACCESS_EXPIRY || '15m') as SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRY = (process.env.JWT_REFRESH_EXPIRY || '7d') as SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRY_SECONDS =
  parseInt(process.env.JWT_REFRESH_EXPIRY_SECONDS, 10) || 7 * 24 * 60 * 60;

/**
 * Access and refresh tokens are signed with different secrets so that a
 * leaked refresh-token secret can't be used to mint access tokens (and
 * vice versa). `JwtService` is injected for access tokens (registered by
 * `AuthModule`); a second instance is built here for refresh tokens since
 * Nest only wires up one default `JwtService` per module.
 */
@Injectable()
export class TokenService {
  private readonly refreshJwtService: JwtService;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(TokenBlacklist)
    private readonly tokenBlacklistRepository: Repository<TokenBlacklist>,
  ) {
    this.refreshJwtService = new JwtService({
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      signOptions: { expiresIn: REFRESH_TOKEN_EXPIRY },
    });
  }

  async issueTokenPair(user: User): Promise<TokenPair> {
    const accessJti = randomUUID();
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      merchant_id: user.merchant_id ?? undefined,
      jti: accessJti,
    };

    const access_token = this.jwtService.sign(accessPayload, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refresh_token = await this.createRefreshToken(user.id);
    const { exp } = this.jwtService.decode(access_token) as { exp: number };

    return { access_token, refresh_token, expires_in: exp };
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const found = await this.tokenBlacklistRepository.findOne({ where: { jti } });
    return !!found;
  }

  async blacklistAccessToken(jti: string, expiresAt: Date): Promise<void> {
    await this.tokenBlacklistRepository.save(
      this.tokenBlacklistRepository.create({ jti, expires_at: expiresAt }),
    );
  }

  /**
   * Rotates a refresh token: the presented token's `jti` is marked revoked
   * and a new access/refresh pair is issued for the given (already reloaded)
   * user. Throws if the token was already used, revoked, or belongs to a
   * different user than the one it was reloaded for.
   */
  async rotateRefreshToken(refreshJti: string, user: User): Promise<TokenPair> {
    const existing = await this.refreshTokenRepository.findOne({ where: { jti: refreshJti } });

    if (!existing || existing.revoked || existing.user_id !== user.id) {
      throw AuthenticationException.tokenInvalid();
    }

    if (existing.expires_at.getTime() < Date.now()) {
      throw AuthenticationException.tokenExpired();
    }

    const newTokenPair = await this.issueTokenPair(user);
    const newRefreshPayload = this.refreshJwtService.decode(newTokenPair.refresh_token) as {
      jti: string;
    };

    existing.revoked = true;
    existing.replaced_by_jti = newRefreshPayload.jti;
    await this.refreshTokenRepository.save(existing);

    return newTokenPair;
  }

  async revokeRefreshToken(refreshJti: string, userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ jti: refreshJti, user_id: userId }, { revoked: true });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ user_id: userId, revoked: false }, { revoked: true });
  }

  async pruneExpired(): Promise<void> {
    const now = new Date();
    await this.tokenBlacklistRepository.delete({ expires_at: LessThan(now) });
    await this.refreshTokenRepository.delete({ expires_at: LessThan(now), revoked: true });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({ user_id: userId, jti, expires_at }),
    );

    return this.refreshJwtService.sign({ sub: userId, jti });
  }
}
