import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { AuthenticatedRequest } from '../interfaces/jwt-payload.interface';
import { RateLimitException } from '../../common/exceptions';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const routeId = `${context.getClass().name}.${context.getHandler().name}`;
    const identifier = request.apiKey?.id || request.user?.userId || request.ip;
    const key = `${routeId}:${identifier}`;

    if (!this.rateLimiter.consume(key, options.limit, options.windowSeconds)) {
      throw new RateLimitException(options.windowSeconds);
    }

    return true;
  }
}
