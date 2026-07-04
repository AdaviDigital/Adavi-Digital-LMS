import { Router } from 'express';
import { prisma } from '../config/prisma';
import { redis, redisEnabled } from '../config/redis';
import { logger } from '../config/logger';
import authRoutes from '../modules/auth/auth.routes';
import coursesRoutes from '../modules/courses/courses.routes';
import categoriesRoutes from '../modules/categories/categories.routes';
import modulesRoutes from '../modules/modules/modules.routes';
import lessonsRoutes from '../modules/lessons/lessons.routes';
import enrollmentsRoutes from '../modules/enrollments/enrollments.routes';
import assignmentsRoutes from '../modules/assignments/assignments.routes';
import quizzesRoutes from '../modules/quizzes/quizzes.routes';
import examsRoutes from '../modules/exams/exams.routes';
import certificatesRoutes from '../modules/certificates/certificates.routes';
import ordersRoutes from '../modules/orders/orders.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import couponsRoutes from '../modules/coupons/coupons.routes';
import reviewsRoutes from '../modules/reviews/reviews.routes';
import messagesRoutes from '../modules/messages/messages.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import blogRoutes from '../modules/blog/blog.routes';
import faqRoutes from '../modules/faq/faq.routes';
import adminRoutes from '../modules/admin/admin.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import aiRoutes from '../modules/ai/ai.routes';

const router = Router();

// Liveness: is the process itself up? No dependency checks — must respond instantly so the
// platform's process supervisor doesn't restart a healthy-but-momentarily-busy instance.
router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Adavi LMS API is healthy', time: new Date().toISOString() });
});

// Readiness: can this instance actually serve traffic? Checks the database (hard dependency)
// and Redis (soft dependency — reported but never fails the check, since the app runs without
// it by design). Use this endpoint, not /health, for load-balancer traffic-routing decisions.
router.get('/health/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'down' | 'disabled'> = { database: 'down', redis: 'disabled' };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (err) {
    logger.error('Readiness check: database unreachable', { error: (err as Error).message });
  }

  if (redisEnabled && redis) {
    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch (err) {
      checks.redis = 'down';
      logger.warn('Readiness check: Redis unreachable', { error: (err as Error).message });
    }
  }

  const isReady = checks.database === 'ok';
  res.status(isReady ? 200 : 503).json({ success: isReady, checks });
});

router.use('/auth', authRoutes);
router.use('/courses', coursesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/modules', modulesRoutes);
router.use('/lessons', lessonsRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/assignments', assignmentsRoutes);
router.use('/quizzes', quizzesRoutes);
router.use('/exams', examsRoutes);
router.use('/certificates', certificatesRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/coupons', couponsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/messages', messagesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/blog', blogRoutes);
router.use('/faq', faqRoutes);
router.use('/admin', adminRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ai', aiRoutes);

export default router;
