import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';

interface PgPoolLike {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Polls the underlying `pg` pool (exposed by TypeORM's postgres driver as
 * `driver.master`) so db_pool_* gauges stay fresh for the "database
 * connection exhaustion" alert, without needing a query on every scrape.
 */
@Injectable()
export class DbPoolMetricsService {
  private readonly logger = new Logger(DbPoolMetricsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly metricsService: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  collect(): void {
    const pool = (this.dataSource.driver as unknown as { master?: PgPoolLike }).master;

    if (!pool || typeof pool.totalCount !== 'number') {
      return;
    }

    try {
      this.metricsService.setDbPoolStats({
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    } catch (error: any) {
      this.logger.debug(`Failed to collect DB pool metrics: ${error.message}`);
    }
  }
}
