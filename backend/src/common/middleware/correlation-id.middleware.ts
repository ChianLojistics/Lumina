import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { RequestContext } from '../logger/request-context';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns a correlation/request ID to every inbound request (reusing one
 * supplied by an upstream proxy if present) and makes it available to the
 * whole request lifecycle via AsyncLocalStorage, so log lines emitted deep
 * inside services can be tied back to the originating request without
 * threading the ID through every function signature.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();

    req['requestId'] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    RequestContext.run({ requestId }, () => next());
  }
}
