import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../../rate-limit/services/rate-limit.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { AuthenticatedRequest } from '../interfaces/jwt-payload.interface';
import { RateLimitException } from '../../common/exceptions';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const endpoint = this.getEndpoint(context);
    
    const rateLimitContext = {
      userId: request.user?.userId,
      userTier: request.user?.tier,
      ipAddress: request.ip,
      endpoint: endpoint,
      isAdmin: request.user?.isAdmin || false,
    };

    const result = await this.rateLimitService.checkRateLimit(rateLimitContext);

    if (!result.allowed) {
      throw new RateLimitException(result.retryAfter || 60);
    }

    return true;
  }

  private getEndpoint(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    return request.route?.path || request.path || 'unknown';
  }
}
