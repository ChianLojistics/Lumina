import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    service = new RateLimiterService();
  });

  it('allows requests up to the limit within the window', () => {
    expect(service.consume('key', 3, 60)).toBe(true);
    expect(service.consume('key', 3, 60)).toBe(true);
    expect(service.consume('key', 3, 60)).toBe(true);
  });

  it('rejects requests once the limit is exceeded', () => {
    service.consume('key', 2, 60);
    service.consume('key', 2, 60);

    expect(service.consume('key', 2, 60)).toBe(false);
  });

  it('tracks separate windows per key', () => {
    service.consume('a', 1, 60);

    expect(service.consume('b', 1, 60)).toBe(true);
  });

  it('allows requests again once old entries fall outside the window', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    service.consume('key', 1, 5);
    expect(service.consume('key', 1, 5)).toBe(false);

    jest.setSystemTime(new Date('2026-01-01T00:00:06Z'));
    expect(service.consume('key', 1, 5)).toBe(true);

    jest.useRealTimers();
  });

  it('resets a key so its history no longer counts', () => {
    service.consume('key', 1, 60);
    service.reset('key');

    expect(service.consume('key', 1, 60)).toBe(true);
  });
});
