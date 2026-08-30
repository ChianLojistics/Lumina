import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('auth')
@Controller('api/auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @Post('register')
  @ApiOperation({ summary: 'Register a new account', description: 'Create a new user account with email and password.' })
  @ApiResponse({ status: 201, description: 'Account created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login', description: 'Authenticate with email and password to receive JWT tokens.' })
  @ApiResponse({ status: 200, description: 'Login successful, returns access and refresh tokens.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token', description: 'Use a valid refresh token to obtain a new access token.' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  refresh(@Req() req: Request & { user: RefreshJwtPayload }) {
    return this.authService.refresh(req.user.sub, req.user.jti);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout', description: 'Invalidate the current session and refresh token.' })
  @ApiResponse({ status: 204, description: 'Logged out successfully.' })
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
  @ApiOperation({ summary: 'Verify email address', description: 'Confirm email ownership using the token sent to the user.' })
  @ApiResponse({ status: 200, description: 'Email verified.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset', description: 'Send a password reset link to the registered email.' })
  @ApiResponse({ status: 200, description: 'Reset link sent (if account exists).' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password', description: 'Set a new password using the reset token.' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.new_password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user profile', description: 'Retrieve the authenticated user profile.' })
  @ApiResponse({ status: 200, description: 'User profile.' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user profile', description: 'Update the authenticated user profile details.' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/setup')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Setup 2FA', description: 'Generate a TOTP secret and QR code for two-factor authentication.' })
  @ApiResponse({ status: 200, description: '2FA setup data with QR code.' })
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupTwoFactor(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/enable')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Enable 2FA', description: 'Activate two-factor authentication after verifying a TOTP code.' })
  @ApiResponse({ status: 200, description: '2FA enabled.' })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code.' })
  async enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: Verify2faDto) {
    await this.authService.enableTwoFactor(user.userId, dto.totp_code);
    return { message: 'Two-factor authentication enabled' };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/disable')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disable 2FA', description: 'Deactivate two-factor authentication.' })
  @ApiResponse({ status: 200, description: '2FA disabled.' })
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
