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
}
