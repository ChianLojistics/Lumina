import { HttpStatus } from '@nestjs/common';
import { PaymentException } from './payment.exception';
import { BlockchainException } from './blockchain.exception';
import { ValidationException } from './validation.exception';
import { AuthenticationException } from './authentication.exception';
import { RateLimitException } from './rate-limit.exception';
import { ErrorCode } from './error-code.enum';
import { AppException } from './app.exception';

describe('Custom exceptions', () => {
  it('PaymentException.notFound produces a 404 with a stable error code', () => {
    const exception = PaymentException.notFound('pay_123');

    expect(exception).toBeInstanceOf(AppException);
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.errorCode).toBe(ErrorCode.PAYMENT_NOT_FOUND);
    expect(exception.message).toContain('pay_123');
  });

  it('PaymentException.expired uses 410 Gone', () => {
    expect(PaymentException.expired('pay_1').getStatus()).toBe(HttpStatus.GONE);
  });

  it('BlockchainException.rpcError uses 502 Bad Gateway', () => {
    const exception = BlockchainException.rpcError('timeout');

    expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    expect(exception.errorCode).toBe(ErrorCode.BLOCKCHAIN_RPC_ERROR);
  });

  it('BlockchainException.transactionFailed carries the transaction hash in details', () => {
    const exception = BlockchainException.transactionFailed('0xabc', 'insufficient fee');

    expect(exception.details).toEqual({ transactionHash: '0xabc' });
  });

  it('ValidationException.fromErrors aggregates field errors', () => {
    const exception = ValidationException.fromErrors(['amount must be positive']);

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
    expect(exception.details).toEqual({ errors: ['amount must be positive'] });
  });

  it('AuthenticationException.invalidCredentials uses 401', () => {
    const exception = AuthenticationException.invalidCredentials();

    expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(exception.errorCode).toBe(ErrorCode.INVALID_CREDENTIALS);
  });

  it('RateLimitException uses 429 and carries retryAfterSeconds', () => {
    const exception = new RateLimitException(30);

    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.errorCode).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    expect(exception.details).toEqual({ retryAfterSeconds: 30 });
  });
});
