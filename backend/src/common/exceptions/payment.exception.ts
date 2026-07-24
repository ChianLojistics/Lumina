import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code.enum';

export class PaymentException extends AppException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super(errorCode, message, statusCode, details);
  }

  static notFound(paymentId: string): PaymentException {
    return new PaymentException(
      ErrorCode.PAYMENT_NOT_FOUND,
      `Payment with ID ${paymentId} not found`,
      HttpStatus.NOT_FOUND,
    );
  }

  static merchantNotFound(merchantAddress: string): PaymentException {
    return new PaymentException(
      ErrorCode.MERCHANT_NOT_FOUND,
      `Merchant with address ${merchantAddress} not found`,
      HttpStatus.NOT_FOUND,
    );
  }

  static expired(paymentId: string): PaymentException {
    return new PaymentException(
      ErrorCode.PAYMENT_EXPIRED,
      `Payment with ID ${paymentId} has expired`,
      HttpStatus.GONE,
    );
  }

  static alreadyConfirmed(paymentId: string): PaymentException {
    return new PaymentException(
      ErrorCode.PAYMENT_ALREADY_CONFIRMED,
      `Payment with ID ${paymentId} is already confirmed`,
      HttpStatus.CONFLICT,
    );
  }
}
