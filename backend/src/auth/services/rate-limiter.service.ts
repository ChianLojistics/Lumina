import { Injectable } from '@nestjs/common';

/**
 * In-process sliding-window rate limiter. Each key (ip, user, or api-key,
 * scoped per-route) keeps a timestamp list of its recent requests; requests
 * older than the window are dropped before counting. This is per-instance
 * state — fine for a single API Gateway process, but a multi-instance
 * deployment would need a shared store (e.g. Redis) to enforce one global
 * limit instead of one per instance.
 */
@Injectable()
export class RateLimiterService {
  private readonly hits = new Map<string, number[]>();

  /** Returns true if the request is allowed, false if it should be rejected. */
  consume(key: string, limit: number, windowSeconds: number): boolean {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const timestamps = (this.hits.get(key) ?? []).filter((ts) => ts > windowStart);

    if (timestamps.length >= limit) {
      this.hits.set(key, timestamps);
      return false;
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return true;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }
}
