import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code.enum';

export class AuthenticationException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.UNAUTHENTICATED,
    message = 'Authentication required',
    statusCode: HttpStatus = HttpStatus.UNAUTHORIZED,
  ) {
    super(errorCode, message, statusCode);
  }

  static invalidCredentials(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.INVALID_CREDENTIALS,
      'Invalid credentials',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static tokenExpired(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.TOKEN_EXPIRED,
      'Authentication token has expired',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static tokenInvalid(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.TOKEN_INVALID,
      'Authentication token is invalid',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static tokenRevoked(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.TOKEN_REVOKED,
      'Authentication token has been revoked',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static emailAlreadyRegistered(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.EMAIL_ALREADY_REGISTERED,
      'An account with this email already exists',
      HttpStatus.CONFLICT,
    );
  }

  static emailNotVerified(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.EMAIL_NOT_VERIFIED,
      'Please verify your email address before logging in',
      HttpStatus.FORBIDDEN,
    );
  }

  static twoFactorRequired(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.TWO_FACTOR_REQUIRED,
      'Two-factor authentication code required',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static twoFactorInvalid(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.TWO_FACTOR_INVALID,
      'Invalid two-factor authentication code',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static apiKeyInvalid(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.API_KEY_INVALID,
      'API key is invalid or has been revoked',
      HttpStatus.UNAUTHORIZED,
    );
  }

  static twoFactorAlreadyEnabled(): AuthenticationException {
    return new AuthenticationException(
      ErrorCode.TWO_FACTOR_ALREADY_ENABLED,
      'Two-factor authentication is already enabled',
      HttpStatus.CONFLICT,
    );
  }
}
