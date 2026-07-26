import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { TokenService, TokenPair } from './services/token.service';
import { TwoFactorService } from './services/two-factor.service';
import { AuthMailerService } from './services/auth-mailer.service';
import { AuthenticationException } from '../common/exceptions';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly twoFactorService: TwoFactorService,
    private readonly mailerService: AuthMailerService,
  ) {}

  async register(dto: RegisterDto): Promise<{ id: string; email: string } > {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });

    if (existing) {
      throw AuthenticationException.emailAlreadyRegistered();
    }

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const { token, hash, expiresAt } = this.createOpaqueToken(EMAIL_VERIFICATION_TTL_MS);

    const user = await this.userRepository.save(
      this.userRepository.create({
        email: dto.email,
        password_hash,
        full_name: dto.full_name,
        role: dto.role === Role.MERCHANT ? Role.MERCHANT : Role.CUSTOMER,
        email_verification_token_hash: hash,
        email_verification_expires_at: expiresAt,
      }),
    );

    this.mailerService
      .sendVerificationEmail(user.email, token)
      .catch((error) => this.logger.error(`Failed to send verification email: ${error.message}`));

    return { id: user.id, email: user.email };
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = this.hashOpaqueToken(rawToken);
    const user = await this.userRepository.findOne({
      where: { email_verification_token_hash: tokenHash },
    });

    if (!user || user.email_verification_expires_at.getTime() < Date.now()) {
      throw AuthenticationException.tokenInvalid();
    }

    user.is_email_verified = true;
    user.email_verification_token_hash = null;
    user.email_verification_expires_at = null;
    await this.userRepository.save(user);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });

    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw AuthenticationException.invalidCredentials();
    }

    if (!user.is_active) {
      throw AuthenticationException.invalidCredentials();
    }

    if (!user.is_email_verified) {
      throw AuthenticationException.emailNotVerified();
    }

    if (user.two_factor_enabled) {
      if (!dto.totp_code) {
        throw AuthenticationException.twoFactorRequired();
      }

      if (!this.twoFactorService.verifyToken(user.two_factor_secret, dto.totp_code)) {
        throw AuthenticationException.twoFactorInvalid();
      }
    }

    return this.tokenService.issueTokenPair(user);
  }

  async refresh(userId: string, refreshJti: string): Promise<TokenPair> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.is_active) {
      throw AuthenticationException.invalidCredentials();
    }

    return this.tokenService.rotateRefreshToken(refreshJti, user);
  }

  async logout(
    userId: string,
    accessJti: string,
    accessTokenExpiresAt: Date,
    refreshJti?: string,
  ): Promise<void> {
    await this.tokenService.blacklistAccessToken(accessJti, accessTokenExpiresAt);

    if (refreshJti) {
      await this.tokenService.revokeRefreshToken(refreshJti, userId);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    // Always respond as if the email was sent, regardless of whether the
    // account exists, so this endpoint can't be used to enumerate emails.
    if (!user) {
      return;
    }

    const { token, hash, expiresAt } = this.createOpaqueToken(PASSWORD_RESET_TTL_MS);
    user.password_reset_token_hash = hash;
    user.password_reset_expires_at = expiresAt;
    await this.userRepository.save(user);

    this.mailerService
      .sendPasswordResetEmail(user.email, token)
      .catch((error) => this.logger.error(`Failed to send password reset email: ${error.message}`));
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashOpaqueToken(rawToken);
    const user = await this.userRepository.findOne({
      where: { password_reset_token_hash: tokenHash },
    });

    if (!user || user.password_reset_expires_at.getTime() < Date.now()) {
      throw AuthenticationException.tokenInvalid();
    }

    user.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password_reset_token_hash = null;
    user.password_reset_expires_at = null;
    await this.userRepository.save(user);
    await this.tokenService.revokeAllUserRefreshTokens(user.id);
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw AuthenticationException.invalidCredentials();
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getProfile(userId);

    if (dto.full_name !== undefined) {
      user.full_name = dto.full_name;
    }

    return this.userRepository.save(user);
  }

  async setupTwoFactor(userId: string): Promise<{ secret: string; otpauth_url: string }> {
    const user = await this.getProfile(userId);

    if (user.two_factor_enabled) {
      throw AuthenticationException.twoFactorAlreadyEnabled();
    }

    const { secret, otpauth_url } = this.twoFactorService.generateSecret(user.email);
    user.two_factor_secret = secret;
    await this.userRepository.save(user);

    return { secret, otpauth_url };
  }

  async enableTwoFactor(userId: string, totpCode: string): Promise<void> {
    const user = await this.getProfile(userId);

    if (!user.two_factor_secret) {
      throw AuthenticationException.tokenInvalid();
    }

    if (!this.twoFactorService.verifyToken(user.two_factor_secret, totpCode)) {
      throw AuthenticationException.twoFactorInvalid();
    }

    user.two_factor_enabled = true;
    await this.userRepository.save(user);
  }

  async disableTwoFactor(userId: string, totpCode: string): Promise<void> {
    const user = await this.getProfile(userId);

    if (!user.two_factor_enabled || !this.twoFactorService.verifyToken(user.two_factor_secret, totpCode)) {
      throw AuthenticationException.twoFactorInvalid();
    }

    user.two_factor_enabled = false;
    user.two_factor_secret = null;
    await this.userRepository.save(user);
  }

  private createOpaqueToken(ttlMs: number): { token: string; hash: string; expiresAt: Date } {
    const token = randomBytes(32).toString('hex');
    return {
      token,
      hash: this.hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    };
  }

  private hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
