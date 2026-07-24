import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokenService } from './token.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { User } from '../entities/user.entity';
import { Role } from '../enums/role.enum';
import { AuthenticationException } from '../../common/exceptions';

describe('TokenService', () => {
  let service: TokenService;
  let refreshTokenRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let tokenBlacklistRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; delete: jest.Mock };

  const user: User = {
    id: 'user-1',
    email: 'merchant@lumina.dev',
    role: Role.MERCHANT,
    merchant_id: 'merchant-1',
  } as User;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  beforeEach(async () => {
    refreshTokenRepository = {
      create: jest.fn((data) => ({ revoked: false, ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    tokenBlacklistRepository = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
      providers: [
        TokenService,
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepository },
        { provide: getRepositoryToken(TokenBlacklist), useValue: tokenBlacklistRepository },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  describe('issueTokenPair', () => {
    it('issues a signed access token and persists the refresh token jti', async () => {
      const pair = await service.issueTokenPair(user);

      expect(pair.access_token).toEqual(expect.any(String));
      expect(pair.refresh_token).toEqual(expect.any(String));
      expect(pair.expires_in).toEqual(expect.any(Number));
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: user.id }),
      );
    });
  });

  describe('isAccessTokenBlacklisted', () => {
    it('returns false when no blacklist entry exists', async () => {
      tokenBlacklistRepository.findOne.mockResolvedValue(null);

      expect(await service.isAccessTokenBlacklisted('jti-1')).toBe(false);
    });

    it('returns true once a jti has been blacklisted', async () => {
      tokenBlacklistRepository.findOne.mockResolvedValue({ jti: 'jti-1' });

      expect(await service.isAccessTokenBlacklisted('jti-1')).toBe(true);
    });
  });

  describe('rotateRefreshToken', () => {
    it('throws when the jti is unknown', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.rotateRefreshToken('missing-jti', user)).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('throws when the token was already revoked', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        jti: 'jti-1',
        user_id: user.id,
        revoked: true,
        expires_at: new Date(Date.now() + 60_000),
      });

      await expect(service.rotateRefreshToken('jti-1', user)).rejects.toThrow(AuthenticationException);
    });

    it('throws when the token belongs to a different user', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        jti: 'jti-1',
        user_id: 'someone-else',
        revoked: false,
        expires_at: new Date(Date.now() + 60_000),
      });

      await expect(service.rotateRefreshToken('jti-1', user)).rejects.toThrow(AuthenticationException);
    });

    it('throws when the token has expired', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        jti: 'jti-1',
        user_id: user.id,
        revoked: false,
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(service.rotateRefreshToken('jti-1', user)).rejects.toThrow(AuthenticationException);
    });

    it('marks the old token revoked and issues a fresh pair', async () => {
      const existing = {
        jti: 'jti-1',
        user_id: user.id,
        revoked: false,
        expires_at: new Date(Date.now() + 60_000),
      };
      refreshTokenRepository.findOne.mockResolvedValue(existing);

      const pair = await service.rotateRefreshToken('jti-1', user);

      expect(pair.access_token).toEqual(expect.any(String));
      expect(existing.revoked).toBe(true);
      expect(existing['replaced_by_jti']).toEqual(expect.any(String));
    });
  });

  describe('revokeRefreshToken', () => {
    it('scopes revocation to jti and user_id', async () => {
      await service.revokeRefreshToken('jti-1', user.id);

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { jti: 'jti-1', user_id: user.id },
        { revoked: true },
      );
    });
  });

  describe('revokeAllUserRefreshTokens', () => {
    it('revokes only the non-revoked tokens for the user', async () => {
      await service.revokeAllUserRefreshTokens(user.id);

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { user_id: user.id, revoked: false },
        { revoked: true },
      );
    });
  });
});
