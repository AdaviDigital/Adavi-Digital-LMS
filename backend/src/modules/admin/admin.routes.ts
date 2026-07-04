import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';

async function logAudit(userId: string | null, action: string, entity: string, entityId?: string, metadata?: unknown, ip?: string) {
  await prisma.auditLog.create({
    data: { userId: userId ?? undefined, action, entity, entityId, metadata: metadata as any, ipAddress: ip },
  });
}

export const adminService = {
  async listUsers(query: { role?: string; page: number; limit: number }) {
    const where = query.role ? { role: query.role as any } : {};
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { profile: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  },

  async setUserActive(adminId: string, userId: string, isActive: boolean, ip?: string) {
    const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });
    await logAudit(adminId, isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', 'User', userId, undefined, ip);
    return user;
  },

  async pendingCourses() {
    return prisma.course.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: { instructor: { include: { profile: true } }, category: true },
    });
  },

  async approveCourse(adminId: string, courseId: string, ip?: string) {
    const course = await prisma.course.update({ where: { id: courseId }, data: { status: 'PUBLISHED' } });
    await logAudit(adminId, 'APPROVE_COURSE', 'Course', courseId, undefined, ip);
    return course;
  },

  async rejectCourse(adminId: string, courseId: string, reason: string, ip?: string) {
    const course = await prisma.course.update({ where: { id: courseId }, data: { status: 'REJECTED' } });
    await logAudit(adminId, 'REJECT_COURSE', 'Course', courseId, { reason }, ip);
    return course;
  },

  async auditLogs(page: number, limit: number) {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { include: { profile: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count(),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getSettings() {
    const settings = await prisma.setting.findMany();
    return Object.fromEntries(settings.map((s: any) => [s.key, s.value]));
  },

  async updateSetting(key: string, value: unknown) {
    return prisma.setting.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });
  },
};

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, page = '1', limit = '20' } = req.query as Record<string, string>;
    const data = await adminService.listUsers({ role, page: parseInt(page, 10), limit: parseInt(limit, 10) });
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const user = await adminService.setUserActive(req.user.sub, req.params.id, req.body.isActive, req.ip);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.get('/courses/pending', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.pendingCourses();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/courses/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const course = await adminService.approveCourse(req.user.sub, req.params.id, req.ip);
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
});

router.post('/courses/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const course = await adminService.rejectCourse(req.user.sub, req.params.id, req.body.reason || '', req.ip);
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
});

router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50' } = req.query as Record<string, string>;
    const data = await adminService.auditLogs(parseInt(page, 10), parseInt(limit, 10));
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.getSettings();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/settings/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await adminService.updateSetting(req.params.key, req.body.value);
    res.status(200).json({ success: true, data: setting });
  } catch (err) {
    next(err);
  }
});

export default router;
