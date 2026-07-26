import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RateLimitException } from '../../common/exceptions';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({ name: 'handler' }),
    getClass: () => ({ name: 'Controller' }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows the request through when the route declares no rate limit', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RateLimitGuard(new RateLimiterService(), reflector);

    expect(guard.canActivate(createContext({ ip: '1.2.3.4' }))).toBe(true);
  });

  it('prefers the api key id, then the user id, then the ip as the limiting key', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ limit: 1, windowSeconds: 60 }),
    } as unknown as Reflector;
    const limiter = new RateLimiterService();
    const consumeSpy = jest.spyOn(limiter, 'consume');
    const guard = new RateLimitGuard(limiter, reflector);

    guard.canActivate(createContext({ apiKey: { id: 'key-1' }, user: { userId: 'user-1' }, ip: '1.2.3.4' }));

    expect(consumeSpy.mock.calls[0][0]).toContain('key-1');
  });

  it('throws RateLimitException once the limit is exceeded', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ limit: 1, windowSeconds: 60 }),
    } as unknown as Reflector;
    const guard = new RateLimitGuard(new RateLimiterService(), reflector);
    const request = { ip: '1.2.3.4' };

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(() => guard.canActivate(createContext(request))).toThrow(RateLimitException);
  });
});
