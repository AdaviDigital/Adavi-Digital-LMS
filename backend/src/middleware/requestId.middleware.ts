import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      rawBody?: Buffer;
    }
  }
}

/**
 * Accepts an inbound X-Request-Id (useful when the platform's load balancer or an upstream
 * service already assigned one) or generates a fresh UUID. Echoed back on the response so
 * the client and server logs can be correlated for a single request.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  req.requestId = (typeof incoming === 'string' && incoming) || randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
