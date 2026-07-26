import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { PaymentException } from '../exceptions/payment.exception';
import { ErrorCode } from '../exceptions/error-code.enum';

function createHost(overrides: { requestId?: string } = {}): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = {
    method: 'GET',
    url: '/api/payments/pay_123',
    requestId: overrides.requestId,
  };
  const response = { status };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, json, status };
}

describe('GlobalExceptionFilter', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('formats an AppException using its own status and error code', () => {
    process.env.NODE_ENV = 'production';
    const filter = new GlobalExceptionFilter();
    const { host, json, status } = createHost({ requestId: 'req-1' });

    filter.catch(PaymentException.notFound('pay_123'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: ErrorCode.PAYMENT_NOT_FOUND,
          message: 'Payment with ID pay_123 not found',
          requestId: 'req-1',
        }),
      }),
    );
  });

  it('formats a built-in HttpException with a mapped error code', () => {
    process.env.NODE_ENV = 'production';
    const filter = new GlobalExceptionFilter();
    const { host, json, status } = createHost({ requestId: 'req-2' });

    filter.catch(new BadRequestException('amount must be positive'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'amount must be positive',
        }),
      }),
    );
  });

  it('hides the raw message for unknown errors in production and omits the stack trace', () => {
    process.env.NODE_ENV = 'production';
    const filter = new GlobalExceptionFilter();
    const { host, json, status } = createHost({ requestId: 'req-3' });

    filter.catch(new Error('db connection string leaked'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const payload = json.mock.calls[0][0];
    expect(payload.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(payload.error.message).not.toContain('db connection string leaked');
    expect(payload.error.stack).toBeUndefined();
  });

  it('includes the stack trace for unknown errors outside production', () => {
    process.env.NODE_ENV = 'development';
    const filter = new GlobalExceptionFilter();
    const { host, json } = createHost({ requestId: 'req-4' });

    filter.catch(new Error('boom'), host);

    const payload = json.mock.calls[0][0];
    expect(payload.error.message).toBe('boom');
    expect(payload.error.stack).toBeDefined();
  });

  it('falls back to generating a requestId when none is present on the request', () => {
    process.env.NODE_ENV = 'production';
    const filter = new GlobalExceptionFilter();
    const { host, json } = createHost();

    filter.catch(PaymentException.notFound('pay_123'), host);

    const payload = json.mock.calls[0][0];
    expect(typeof payload.error.requestId).toBe('string');
    expect(payload.error.requestId.length).toBeGreaterThan(0);
  });
});
