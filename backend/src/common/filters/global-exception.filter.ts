import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-code.enum';
import { captureException } from '../tracking/sentry';

interface StandardErrorBody {
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Catches every exception thrown anywhere in the request pipeline and
 * normalizes it into the standard `{ error: { code, message, ... } }`
 * response shape, so API consumers never have to branch on which service
 * produced the error.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request?.['requestId'] as string) || randomUUID();

    const { status, code, message, details } = this.resolve(exception);

    const body: StandardErrorBody = {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId,
        ...(details ? { details } : {}),
      },
    };

    if (!isProduction() && exception instanceof Error) {
      body.error.stack = exception.stack;
    }

    this.log(exception, status, requestId, request);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      captureException(exception, { requestId, path: request?.url, method: request?.method });
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    if (exception instanceof AppException) {
      const response = exception.getResponse() as Record<string, unknown>;
      return {
        status: exception.getStatus(),
        code: exception.errorCode,
        message: exception.message,
        details: (response?.details as Record<string, unknown>) ?? exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as Record<string, unknown>)?.message as string) || exception.message;

      return {
        status,
        code: this.httpStatusToErrorCode(status),
        message: Array.isArray(message) ? message.join(', ') : message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: isProduction()
        ? 'An unexpected error occurred'
        : exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred',
    };
  }

  private httpStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHENTICATED;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }

  private log(exception: unknown, status: number, requestId: string, request?: Request): void {
    const context = `${request?.method ?? ''} ${request?.url ?? ''} [${requestId}]`;
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Unhandled error on ${context}`, stack);
    } else {
      this.logger.warn(
        `Handled error on ${context}: ${exception instanceof Error ? exception.message : 'unknown error'}`,
      );
    }
  }
}
