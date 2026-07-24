import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code.enum';

export class ValidationException extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_FAILED, message, HttpStatus.BAD_REQUEST, details);
  }

  static fromErrors(errors: string[]): ValidationException {
    return new ValidationException('Request validation failed', { errors });
  }
}
