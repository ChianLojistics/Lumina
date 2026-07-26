import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';

export interface AppExceptionPayload {
  errorCode: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Base exception for all domain-specific errors. Carries a stable
 * `errorCode` (independent of the HTTP status) so clients can branch
 * on error type without parsing message strings.
 */
export class AppException extends HttpException {
  readonly errorCode: ErrorCode | string;
  readonly details?: Record<string, unknown>;

  constructor(
    errorCode: ErrorCode | string,
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>,
  ) {
    super({ errorCode, message, details } as AppExceptionPayload, statusCode);
    this.errorCode = errorCode;
    this.details = details;
  }
}
