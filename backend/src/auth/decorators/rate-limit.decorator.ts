import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Sliding window size, in seconds. */
  windowSeconds: number;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
