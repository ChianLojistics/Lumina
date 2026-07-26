import { CorrelationIdMiddleware, REQUEST_ID_HEADER } from './correlation-id.middleware';
import { RequestContext } from '../logger/request-context';

describe('CorrelationIdMiddleware', () => {
  const middleware = new CorrelationIdMiddleware();

  it('generates a request ID when none is supplied and exposes it on req/res', () => {
    const req: any = { headers: {} };
    const setHeader = jest.fn();
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('reuses an incoming x-request-id header instead of generating a new one', () => {
    const req: any = { headers: { [REQUEST_ID_HEADER]: 'upstream-id' } };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toBe('upstream-id');
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'upstream-id');
  });

  it('makes the request ID available via RequestContext during the downstream call', () => {
    const req: any = { headers: { [REQUEST_ID_HEADER]: 'ctx-id' } };
    const res: any = { setHeader: jest.fn() };
    let seenDuringNext: string | undefined;

    middleware.use(req, res, () => {
      seenDuringNext = RequestContext.requestId;
    });

    expect(seenDuringNext).toBe('ctx-id');
    expect(RequestContext.requestId).toBeUndefined();
  });
});
