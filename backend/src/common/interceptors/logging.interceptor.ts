import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { redact } from '../logger/redact.util';

/**
 * Logs one line per request on completion (method, path, status, duration)
 * with the request body redacted, giving request-level tracing without
 * requiring every controller to log manually.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const requestId = request['requestId'] as string;
    const start = Date.now();

    this.logger.debug(
      `--> ${request.method} ${request.url} [${requestId}] body=${JSON.stringify(redact(request.body))}`,
    );

    return next.handle().pipe(
      tap({
        next: () => this.logCompletion(request, response, requestId, start),
        error: () => this.logCompletion(request, response, requestId, start),
      }),
    );
  }

  private logCompletion(request: Request, response: Response, requestId: string, start: number): void {
    const durationMs = Date.now() - start;
    this.logger.log(
      `<-- ${request.method} ${request.url} ${response.statusCode} [${requestId}] ${durationMs}ms`,
    );
  }
}
