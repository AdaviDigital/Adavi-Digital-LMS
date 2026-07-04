import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { logger } from '../config/logger';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof AppError) {
    // Operational errors (4xx, expected failure modes) are logged at `warn` — they're not bugs,
    // just don't need to page anyone. Anything else reaching here is a real bug and logged as
    // `error` with the full stack, below.
    logger.warn(err.message, {
      requestId: req.requestId,
      statusCode: err.statusCode,
      path: req.originalUrl,
      method: req.method,
    });
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  logger.error('Unhandled error', {
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
    error: err instanceof Error ? err.stack : err,
  });

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId: req.requestId,
    ...(env.NODE_ENV === 'development' && err instanceof Error ? { stack: err.stack } : {}),
  });
}
