import { CircuitBreaker, CircuitState } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('starts closed and allows attempts', () => {
    const breaker = new CircuitBreaker(3, 1000);

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.canAttempt()).toBe(true);
  });

  it('stays closed and resets the failure count on success', () => {
    const breaker = new CircuitBreaker(3, 1000);

    breaker.onFailure();
    breaker.onFailure();
    breaker.onSuccess();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    breaker.onFailure();
    breaker.onFailure();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('opens after the failure threshold is reached and blocks attempts', () => {
    const breaker = new CircuitBreaker(3, 60_000);

    breaker.onFailure();
    breaker.onFailure();
    breaker.onFailure();

    expect(breaker.getState()).toBe(CircuitState.OPEN);
    expect(breaker.canAttempt()).toBe(false);
  });

  it('moves to half-open after the reset timeout and closes on success', () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker(1, 1000);

    breaker.onFailure();
    expect(breaker.canAttempt()).toBe(false);

    jest.advanceTimersByTime(1001);

    expect(breaker.canAttempt()).toBe(true);
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    breaker.onSuccess();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    jest.useRealTimers();
  });

  it('reopens if the half-open trial attempt fails', () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker(1, 1000);

    breaker.onFailure();
    jest.advanceTimersByTime(1001);
    expect(breaker.canAttempt()).toBe(true);

    breaker.onFailure();

    expect(breaker.getState()).toBe(CircuitState.OPEN);
    expect(breaker.canAttempt()).toBe(false);

    jest.useRealTimers();
  });
});
