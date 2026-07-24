import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code.enum';

export class AuthorizationException extends AppException {
  constructor(message = 'You do not have permission to perform this action') {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}
