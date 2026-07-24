import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { ApiKeyController } from './api-key.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { ApiKeyService } from './services/api-key.service';
import { TwoFactorService } from './services/two-factor.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { AuthMailerService } from './services/auth-mailer.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { OwnershipGuard } from './guards/ownership.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { ApiKey } from './entities/api-key.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, TokenBlacklist, ApiKey]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as SignOptions['expiresIn'],
      },
    }),
  ],
  controllers: [AuthController, ApiKeyController],
  providers: [
    AuthService,
    TokenService,
    ApiKeyService,
    TwoFactorService,
    RateLimiterService,
    AuthMailerService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    ApiKeyGuard,
    OwnershipGuard,
    RateLimitGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    ApiKeyService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    ApiKeyGuard,
    OwnershipGuard,
    RateLimitGuard,
  ],
})
export class AuthModule {}
