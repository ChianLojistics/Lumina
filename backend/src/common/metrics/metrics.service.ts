import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

/**
 * Central Prometheus registry and metric instruments for the backend.
 * Every other metrics helper (HTTP interceptor, TypeORM logger, external
 * service wrappers) records through this service so `/metrics` exposes a
 * single, consistent registry.
 */
@Injectable()
export class MetricsService {
  readonly registry: client.Registry;

  readonly httpRequestDuration: client.Histogram<string>;
  readonly httpRequestsTotal: client.Counter<string>;

  readonly dbQueryDuration: client.Histogram<string>;
  readonly dbQueryErrorsTotal: client.Counter<string>;

  readonly externalServiceCallDuration: client.Histogram<string>;
  readonly externalServiceCallsTotal: client.Counter<string>;

  readonly queueDepth: client.Gauge<string>;
  readonly queueJobDuration: client.Histogram<string>;
  readonly queueJobsTotal: client.Counter<string>;

  readonly paymentsTotal: client.Counter<string>;
  readonly paymentVolumeTotal: client.Counter<string>;

  readonly rampOperationsTotal: client.Counter<string>;
  readonly rampOperationVolumeTotal: client.Counter<string>;

  readonly dbPoolTotalConnections: client.Gauge<string>;
  readonly dbPoolIdleConnections: client.Gauge<string>;
  readonly dbPoolWaitingRequests: client.Gauge<string>;

  constructor() {
    this.registry = new client.Registry();
    this.registry.setDefaultLabels({ service: 'lumina-backend' });
    client.collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.dbQueryErrorsTotal = new client.Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation'],
      registers: [this.registry],
    });

    this.externalServiceCallDuration = new client.Histogram({
      name: 'external_service_call_duration_seconds',
      help: 'Duration of outbound calls to external services in seconds',
      labelNames: ['service', 'operation', 'status'],
      buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.externalServiceCallsTotal = new client.Counter({
      name: 'external_service_calls_total',
      help: 'Total number of outbound calls to external services',
      labelNames: ['service', 'operation', 'status'],
      registers: [this.registry],
    });

    this.queueDepth = new client.Gauge({
      name: 'queue_depth',
      help: 'Current number of pending/retrying jobs in a queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueJobDuration = new client.Histogram({
      name: 'queue_job_processing_duration_seconds',
      help: 'Duration of queue job processing in seconds',
      labelNames: ['queue'],
      buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.queueJobsTotal = new client.Counter({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    this.paymentsTotal = new client.Counter({
      name: 'payments_total',
      help: 'Total number of payments processed, by currency and status',
      labelNames: ['currency', 'status'],
      registers: [this.registry],
    });

    this.paymentVolumeTotal = new client.Counter({
      name: 'payment_volume_total',
      help: 'Total payment volume processed, by currency and status',
      labelNames: ['currency', 'status'],
      registers: [this.registry],
    });

    this.rampOperationsTotal = new client.Counter({
      name: 'ramp_operations_total',
      help: 'Total number of on-ramp/off-ramp operations, by type, currency and status',
      labelNames: ['type', 'currency', 'status'],
      registers: [this.registry],
    });

    this.rampOperationVolumeTotal = new client.Counter({
      name: 'ramp_operation_volume_total',
      help: 'Total on-ramp/off-ramp fiat volume, by type, currency and status',
      labelNames: ['type', 'currency', 'status'],
      registers: [this.registry],
    });

    this.dbPoolTotalConnections = new client.Gauge({
      name: 'db_pool_total_connections',
      help: 'Total number of connections currently held by the database pool',
      registers: [this.registry],
    });

    this.dbPoolIdleConnections = new client.Gauge({
      name: 'db_pool_idle_connections',
      help: 'Number of idle connections currently held by the database pool',
      registers: [this.registry],
    });

    this.dbPoolWaitingRequests = new client.Gauge({
      name: 'db_pool_waiting_requests',
      help: 'Number of queries waiting for a free connection in the database pool',
      registers: [this.registry],
    });
  }

  /** Times an external service call and records success/error counters + latency. */
  async trackExternalCall<T>(service: string, operation: string, fn: () => Promise<T>): Promise<T> {
    const end = this.externalServiceCallDuration.startTimer({ service, operation });

    try {
      const result = await fn();
      end({ status: 'success' });
      this.externalServiceCallsTotal.inc({ service, operation, status: 'success' });
      return result;
    } catch (error) {
      end({ status: 'error' });
      this.externalServiceCallsTotal.inc({ service, operation, status: 'error' });
      throw error;
    }
  }

  recordDbQuery(operation: string, durationSeconds: number): void {
    this.dbQueryDuration.observe({ operation }, durationSeconds);
  }

  recordDbQueryError(operation: string): void {
    this.dbQueryErrorsTotal.inc({ operation });
  }

  setQueueDepth(queue: string, depth: number): void {
    this.queueDepth.set({ queue }, depth);
  }

  recordQueueJob(queue: string, status: 'success' | 'error', durationSeconds: number): void {
    this.queueJobDuration.observe({ queue }, durationSeconds);
    this.queueJobsTotal.inc({ queue, status });
  }

  recordPayment(currency: string, status: string, amount: number): void {
    this.paymentsTotal.inc({ currency, status });
    this.paymentVolumeTotal.inc({ currency, status }, amount);
  }

  recordRampOperation(type: string, currency: string, status: string, amount: number): void {
    this.rampOperationsTotal.inc({ type, currency, status });
    this.rampOperationVolumeTotal.inc({ type, currency, status }, amount);
  }

  setDbPoolStats(stats: { total: number; idle: number; waiting: number }): void {
    this.dbPoolTotalConnections.set(stats.total);
    this.dbPoolIdleConnections.set(stats.idle);
    this.dbPoolWaitingRequests.set(stats.waiting);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
