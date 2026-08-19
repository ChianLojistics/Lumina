import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

const SCAN_TOKEN_HEADER = 'x-scan-token';

/**
 * CI pipelines ingest scan results, not logged-in users, so this checks a shared
 * secret (SECURITY_SCAN_TOKEN) instead of the JWT/session guards used elsewhere.
 */
@Injectable()
export class ScanIngestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env.SECURITY_SCAN_TOKEN;
    if (!expectedToken) {
      throw new UnauthorizedException('Security scan ingestion is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedToken = request.headers[SCAN_TOKEN_HEADER];

    if (providedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid scan ingestion token');
    }

    return true;
  }
}
