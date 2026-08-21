import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService, RateLimitContext } from '../services/rate-limit.service';
import { RateLimitMonitoringService } from '../services/rate-limit-monitoring.service';
import { RateLimitException } from '../../common/exceptions';

export interface RateLimitRequest extends Request {
  user?: {
    id: string;
    tier?: string;
    isAdmin?: boolean;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly monitoringService: RateLimitMonitoringService,
  ) {}

  async use(req: RateLimitRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();

    try {
      const context: RateLimitContext = {
        userId: req.user?.id,
        userTier: req.user?.tier,
        ipAddress: this.getClientIp(req),
        endpoint: this.getEndpoint(req),
        isAdmin: req.user?.isAdmin || false,
      };

      const result = await this.rateLimitService.checkRateLimit(context);
      const responseTime = Date.now() - startTime;

      this.monitoringService.recordRequest(result.allowed, result.actionTaken, responseTime);

      if (result.allowed) {
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.reset);
        
        if (result.policyId) {
          res.setHeader('X-RateLimit-Policy', result.policyId);
        }
        
        next();
      } else {
        res.setHeader('Retry-After', result.retryAfter || 60);
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', result.reset);
        
        if (result.policyId) {
          res.setHeader('X-RateLimit-Policy', result.policyId);
        }

        this.handleRateLimitExceeded(req, res, result);
      }
    } catch (error) {
      this.logger.error(`Rate limit middleware error: ${error instanceof Error ? error.message : String(error)}`);
      next();
    }
  }

  private handleRateLimitExceeded(req: RateLimitRequest, res: Response, result: any): void {
    const action = result.actionTaken || 'throttle';

    switch (action) {
      case 'block':
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter,
        });
        break;

      case 'challenge':
        res.status(403).json({
          error: 'Challenge Required',
          message: 'Additional verification required to continue.',
          challengeType: 'captcha',
        });
        break;

      case 'throttle':
      default:
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please slow down your requests.',
          retryAfter: result.retryAfter,
        });
        break;
    }
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any).socket?.remoteAddress ||
      'unknown'
    );
  }

  private getEndpoint(req: Request): string {
    return req.route?.path || req.path || 'unknown';
  }
}
