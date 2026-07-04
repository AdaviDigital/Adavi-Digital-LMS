import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimit.middleware';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new student or instructor account
 *     tags: [Auth]
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token and get a new access token
 *     tags: [Auth]
 */
router.post('/refresh', authLimiter, validate(refreshSchema.partial()), authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke refresh token
 *     tags: [Auth]
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 */
router.get('/me', authenticate, authController.me);

export default router;
