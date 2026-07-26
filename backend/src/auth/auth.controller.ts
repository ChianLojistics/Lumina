import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RateLimit } from './decorators/rate-limit.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AuthenticatedUser, RefreshJwtPayload } from './interfaces/jwt-payload.interface';

@Controller('api/auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Req() req: Request & { user: RefreshJwtPayload }) {
    return this.authService.refresh(req.user.sub, req.user.jti);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<RefreshTokenDto>,
  ) {
    await this.authService.logout(
      user.userId,
      user.jti,
      new Date(user.exp * 1000),
      body?.refresh_token ? this.decodeRefreshJti(body.refresh_token) : undefined,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.new_password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupTwoFactor(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/enable')
  async enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: Verify2faDto) {
    await this.authService.enableTwoFactor(user.userId, dto.totp_code);
    return { message: 'Two-factor authentication enabled' };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/disable')
  async disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: Verify2faDto) {
    await this.authService.disableTwoFactor(user.userId, dto.totp_code);
    return { message: 'Two-factor authentication disabled' };
  }

  // Decoded without verifying the signature: the caller is already
  // authenticated via the access token, and revoking a jti that doesn't
  // belong to them is a no-op (the DB update simply matches no rows).
  private decodeRefreshJti(rawRefreshToken: string): string | undefined {
    try {
      const payload = JSON.parse(
        Buffer.from(rawRefreshToken.split('.')[1], 'base64').toString('utf8'),
      );
      return payload.jti;
    } catch {
      return undefined;
    }
  }
}
