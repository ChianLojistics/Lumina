import * as Sentry from '@sentry/node';
import { redact } from '../logger/redact.util';

let initialized = false;

/**
 * Initializes Sentry when SENTRY_DSN is configured. Safe to call
 * unconditionally — becomes a no-op in environments (local dev, CI) that
 * don't set a DSN, so error tracking never blocks startup.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    beforeSend(event) {
      return redact(event);
    },
  });

  initialized = true;
}

export function isSentryEnabled(): boolean {
  return initialized;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) {
    return;
  }
  Sentry.captureException(error, context ? { extra: redact(context) } : undefined);
}
