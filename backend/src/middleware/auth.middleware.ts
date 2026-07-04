import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface AuthPayload {
  sub: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const cookieToken = (req as any).cookies?.access_token;
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : cookieToken;

  if (!token) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    return next();
  } catch (err) {
    return next(new AppError(401, 'Invalid or expired token'));
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const cookieToken = (req as any).cookies?.access_token;
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : cookieToken;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
  } catch {
    /* ignore invalid token for optional auth */
  }
  return next();
}

export function authorize(...allowedRoles: AuthPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}
