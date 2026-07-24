export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Trips after `failureThreshold` consecutive failures and stops allowing
 * attempts for `resetTimeoutMs`, so a struggling RPC endpoint isn't hammered
 * by every polling cycle. A single trial attempt is allowed once the reset
 * window elapses (half-open); it closes the circuit on success or reopens
 * it on failure.
 */
export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private nextAttemptAt = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly resetTimeoutMs = 60_000,
  ) {}

  getState(): CircuitState {
    return this.state;
  }

  canAttempt(): boolean {
    if (this.state !== CircuitState.OPEN) {
      return true;
    }

    if (Date.now() < this.nextAttemptAt) {
      return false;
    }

    this.state = CircuitState.HALF_OPEN;
    return true;
  }

  onSuccess(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
  }

  onFailure(): void {
    this.failureCount += 1;

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
    }
  }
}
