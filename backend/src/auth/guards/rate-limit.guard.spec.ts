import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from '../../rate-limit/services/rate-limit.service';
import { RateLimitException } from '../../common/exceptions';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({ name: 'handler' }),
    getClass: () => ({ name: 'Controller' }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows the request through when the route declares no rate limit', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const rateLimitService = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
      getSystemLoad: jest.fn().mockReturnValue(0),
      updateSystemLoad: jest.fn(),
      resetRateLimit: jest.fn(),
    } as unknown as RateLimitService;
    const guard = new RateLimitGuard(rateLimitService, reflector);

    expect(await guard.canActivate(createContext({ ip: '1.2.3.4' }))).toBe(true);
  });

  it('prefers the api key id, then the user id, then the ip as the limiting key', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ limit: 1, windowSeconds: 60 }),
    } as unknown as Reflector;
    const rateLimitService = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
      getSystemLoad: jest.fn().mockReturnValue(0),
      updateSystemLoad: jest.fn(),
      resetRateLimit: jest.fn(),
    } as unknown as RateLimitService;
    const checkSpy = jest.spyOn(rateLimitService, 'checkRateLimit');
    const guard = new RateLimitGuard(rateLimitService, reflector);

    await guard.canActivate(createContext({ apiKey: { id: 'key-1' }, user: { userId: 'user-1' }, ip: '1.2.3.4' }));

    expect(checkSpy).toHaveBeenCalled();
  });

  it('throws RateLimitException once the limit is exceeded', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ limit: 1, windowSeconds: 60 }),
    } as unknown as Reflector;
    const rateLimitService = {
      checkRateLimit: jest.fn()
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false, retryAfter: 60 }),
      getSystemLoad: jest.fn().mockReturnValue(0),
      updateSystemLoad: jest.fn(),
      resetRateLimit: jest.fn(),
    } as unknown as RateLimitService;
    const guard = new RateLimitGuard(rateLimitService, reflector);
    const request = { ip: '1.2.3.4' };

    expect(await guard.canActivate(createContext(request))).toBe(true);
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(RateLimitException);
  });
});
