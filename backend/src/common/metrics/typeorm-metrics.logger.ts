import { Logger as NestLogger } from '@nestjs/common';
import type { Logger as TypeOrmLogger } from 'typeorm';
import { MetricsService } from './metrics.service';

const SLOW_QUERY_THRESHOLD_MS = 200;

function extractOperation(query: string): string {
  const match = query.trim().match(/^(\w+)/);
  return match ? match[1].toUpperCase() : 'UNKNOWN';
}

/**
 * TypeORM logger that feeds query duration/error metrics instead of (or in
 * addition to) writing logs. Paired with `maxQueryExecutionTime: 1` on the
 * DataSource so `logQuerySlow` fires for effectively every query, which is
 * the only TypeORM logger hook that receives execution time.
 */
export class TypeOrmMetricsLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('DatabaseQuery');

  constructor(private readonly metricsService: MetricsService) {}

  logQuery(): void {
    // Intentionally a no-op: per-query duration is only available via
    // logQuerySlow, so we avoid double-counting/verbose logs here.
  }

  logQueryError(error: string | Error, query: string): void {
    this.metricsService.recordDbQueryError(extractOperation(query));
    this.logger.error(`Query failed: ${typeof error === 'string' ? error : error.message}`);
  }

  logQuerySlow(time: number, query: string): void {
    const operation = extractOperation(query);
    this.metricsService.recordDbQuery(operation, time / 1000);

    if (time > SLOW_QUERY_THRESHOLD_MS) {
      this.logger.warn(`Slow query (${time}ms): ${operation}`);
    }
  }

  logSchemaBuild(message: string): void {
    this.logger.log(message);
  }

  logMigration(message: string): void {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') {
      this.logger.warn(message as string);
    } else {
      this.logger.log(message as string);
    }
  }
}
