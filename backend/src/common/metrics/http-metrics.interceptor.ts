import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Records HTTP request rate/latency/error metrics for every route. Runs
 * alongside LoggingInterceptor so metrics stay available even if logging
 * changes.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const method = request.method;
    const route = this.resolveRoute(request);
    const end = this.metricsService.httpRequestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => this.record(end, method, route, response.statusCode),
        error: (error) => this.record(end, method, route, error?.status ?? error?.getStatus?.() ?? 500),
      }),
    );
  }

  private record(
    end: (labels?: Record<string, string | number>) => number,
    method: string,
    route: string,
    statusCode: number,
  ): void {
    const status_code = String(statusCode);
    end({ status_code });
    this.metricsService.httpRequestsTotal.inc({ method, route, status_code });
  }

  private resolveRoute(request: Request): string {
    const matchedPath = (request.route as { path?: string } | undefined)?.path;
    return matchedPath || request.path || request.url;
  }
}
