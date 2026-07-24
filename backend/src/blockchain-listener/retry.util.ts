export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Retries `fn` with exponential backoff, doubling the delay on each attempt
 * up to `maxDelayMs`. Each attempt is bounded by `timeoutMs` when provided.
 * Rethrows the last error once `maxAttempts` is exhausted.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs = 500, maxDelayMs = 10_000, timeoutMs } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return timeoutMs ? await withTimeout(fn(), timeoutMs) : await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
