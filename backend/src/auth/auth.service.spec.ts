import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { TwoFactorService } from './services/two-factor.service';
import { AuthMailerService } from './services/auth-mailer.service';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';
import { AuthenticationException } from '../common/exceptions';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
  let tokenService: { issueTokenPair: jest.Mock; rotateRefreshToken: jest.Mock; revokeAllUserRefreshTokens: jest.Mock };
  let twoFactorService: { verifyToken: jest.Mock; generateSecret: jest.Mock };
  let mailerService: { sendVerificationEmail: jest.Mock; sendPasswordResetEmail: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      create: jest.fn((data) => ({ is_active: true, is_email_verified: false, ...data })),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
    };
    tokenService = {
      issueTokenPair: jest.fn(async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 123 })),
      rotateRefreshToken: jest.fn(),
      revokeAllUserRefreshTokens: jest.fn(),
    };
    twoFactorService = { verifyToken: jest.fn(), generateSecret: jest.fn() };
    mailerService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: TokenService, useValue: tokenService },
        { provide: TwoFactorService, useValue: twoFactorService },
        { provide: AuthMailerService, useValue: mailerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('throws when the email is already registered', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ email: 'taken@lumina.dev', password: 'password123' }),
      ).rejects.toThrow(AuthenticationException);
    });

    it('creates a customer by default and sends a verification email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.register({ email: 'new@lumina.dev', password: 'password123' });

      expect(result.email).toBe('new@lumina.dev');
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.CUSTOMER, email: 'new@lumina.dev' }),
      );
      expect(mailerService.sendVerificationEmail).toHaveBeenCalledWith(
        'new@lumina.dev',
        expect.any(String),
      );
    });

    it('does not allow self-registration as admin', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await service.register({
        email: 'sneaky@lumina.dev',
        password: 'password123',
        role: Role.ADMIN,
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.CUSTOMER }),
      );
    });
  });

  describe('login', () => {
    const basePassword = 'password123';
    let passwordHash: string;

    beforeAll(async () => {
      passwordHash = await bcrypt.hash(basePassword, 4);
    });

    it('throws on an unknown email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@lumina.dev', password: basePassword })).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('throws on a wrong password', async () => {
      userRepository.findOne.mockResolvedValue({
        password_hash: passwordHash,
        is_active: true,
        is_email_verified: true,
      });

      await expect(service.login({ email: 'user@lumina.dev', password: 'wrong' })).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('throws when the email has not been verified', async () => {
      userRepository.findOne.mockResolvedValue({
        password_hash: passwordHash,
        is_active: true,
        is_email_verified: false,
      });

      await expect(service.login({ email: 'user@lumina.dev', password: basePassword })).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('requires a TOTP code when 2FA is enabled', async () => {
      userRepository.findOne.mockResolvedValue({
        password_hash: passwordHash,
        is_active: true,
        is_email_verified: true,
        two_factor_enabled: true,
        two_factor_secret: 'secret',
      });

      await expect(service.login({ email: 'user@lumina.dev', password: basePassword })).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('rejects an invalid TOTP code', async () => {
      userRepository.findOne.mockResolvedValue({
        password_hash: passwordHash,
        is_active: true,
        is_email_verified: true,
        two_factor_enabled: true,
        two_factor_secret: 'secret',
      });
      twoFactorService.verifyToken.mockReturnValue(false);

      await expect(
        service.login({ email: 'user@lumina.dev', password: basePassword, totp_code: '000000' }),
      ).rejects.toThrow(AuthenticationException);
    });

    it('issues a token pair on valid credentials', async () => {
      userRepository.findOne.mockResolvedValue({
        password_hash: passwordHash,
        is_active: true,
        is_email_verified: true,
        two_factor_enabled: false,
      });

      const result = await service.login({ email: 'user@lumina.dev', password: basePassword });

      expect(result).toEqual({ access_token: 'a', refresh_token: 'r', expires_in: 123 });
      expect(tokenService.issueTokenPair).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('does nothing (and does not throw) when the email is unknown', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.forgotPassword('nobody@lumina.dev')).resolves.toBeUndefined();
      expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('stores a reset token and emails it when the user exists', async () => {
      userRepository.findOne.mockResolvedValue({ email: 'user@lumina.dev' });

      await service.forgotPassword('user@lumina.dev');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password_reset_token_hash: expect.any(String) }),
      );
      expect(mailerService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@lumina.dev',
        expect.any(String),
      );
    });
  });

  describe('verifyEmail', () => {
    it('throws for an unknown or expired token', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(AuthenticationException);
    });

    it('marks the user verified for a valid token', async () => {
      userRepository.findOne.mockResolvedValue({
        email_verification_expires_at: new Date(Date.now() + 60_000),
        is_email_verified: false,
      });

      await service.verifyEmail('good-token');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_email_verified: true, email_verification_token_hash: null }),
      );
    });
  });
});
