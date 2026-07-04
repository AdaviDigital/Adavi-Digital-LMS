import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { env } from '../../config/env';

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
};

function sanitizeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body);
      res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTS);
      res.status(201).json({ success: true, data: { user: sanitizeUser(user), accessToken } });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password);
      res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTS);
      res.status(200).json({ success: true, data: { user: sanitizeUser(user), accessToken } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refresh_token || req.body.refreshToken;
      const { accessToken, refreshToken } = await authService.refresh(token);
      res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTS);
      res.status(200).json({ success: true, data: { accessToken } });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refresh_token || req.body.refreshToken;
      if (token) await authService.logout(token);
      res.clearCookie('refresh_token', { path: '/api/v1/auth' });
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response) {
    res.status(200).json({ success: true, data: { user: req.user } });
  },
};
