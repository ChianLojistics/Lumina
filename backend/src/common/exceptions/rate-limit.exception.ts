import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code.enum';

export class RateLimitException extends AppException {
  constructor(retryAfterSeconds?: number) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded, please try again later',
      HttpStatus.TOO_MANY_REQUESTS,
      retryAfterSeconds !== undefined ? { retryAfterSeconds } : undefined,
    );
  }
}
