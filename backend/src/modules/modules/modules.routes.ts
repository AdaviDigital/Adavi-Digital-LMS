import { z } from 'zod';
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { validate } from '../../middleware/validate.middleware';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const createModuleSchema = z.object({
  body: z.object({
    courseId: z.string().uuid(),
    title: z.string().min(1),
    order: z.number().int().min(0).default(0),
  }),
});

const updateModuleSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    order: z.number().int().min(0).optional(),
  }),
});

const reorderModulesSchema = z.object({
  body: z.object({
    courseId: z.string().uuid(),
    orderedModuleIds: z.array(z.string().uuid()).min(1),
  }),
});

async function assertCourseOwnership(courseId: string, userId: string, isAdmin: boolean) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, 'Course not found');
  if (course.instructorId !== userId && !isAdmin) {
    throw new AppError(403, 'You do not own this course');
  }
  return course;
}

export const modulesService = {
  async create(userId: string, isAdmin: boolean, input: { courseId: string; title: string; order: number }) {
    await assertCourseOwnership(input.courseId, userId, isAdmin);
    return prisma.module.create({ data: input });
  },

  async reorder(userId: string, isAdmin: boolean, courseId: string, orderedModuleIds: string[]) {
    await assertCourseOwnership(courseId, userId, isAdmin);
    const modules = await prisma.module.findMany({ where: { courseId } });
    if (modules.length !== orderedModuleIds.length || !modules.every((m: any) => orderedModuleIds.includes(m.id))) {
      throw new AppError(422, 'orderedModuleIds must contain exactly the modules belonging to this course');
    }
    await prisma.$transaction(
      orderedModuleIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: index } })),
    );
    return prisma.module.findMany({ where: { courseId }, orderBy: { order: 'asc' } });
  },

  async update(moduleId: string, userId: string, isAdmin: boolean, input: { title?: string; order?: number }) {
    const mod = await prisma.module.findUnique({ where: { id: moduleId }, include: { course: true } });
    if (!mod) throw new AppError(404, 'Module not found');
    if (mod.course.instructorId !== userId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    return prisma.module.update({ where: { id: moduleId }, data: input });
  },

  async remove(moduleId: string, userId: string, isAdmin: boolean) {
    const mod = await prisma.module.findUnique({ where: { id: moduleId }, include: { course: true } });
    if (!mod) throw new AppError(404, 'Module not found');
    if (mod.course.instructorId !== userId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    await prisma.module.delete({ where: { id: moduleId } });
  },
};

const router = Router();

/**
 * @openapi
 * /modules:
 *   post:
 *     summary: Create a module (course section) — Instructor/Admin
 *     tags: [Modules]
 */
router.post(
  '/',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(createModuleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const mod = await modulesService.create(req.user.sub, req.user.role === 'ADMIN', req.body);
      res.status(201).json({ success: true, data: mod });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /modules/reorder:
 *   patch:
 *     summary: Reorder all modules within a course (drag-and-drop course builder)
 *     tags: [Modules]
 */
router.patch(
  '/reorder',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(reorderModulesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const modules = await modulesService.reorder(
        req.user.sub,
        req.user.role === 'ADMIN',
        req.body.courseId,
        req.body.orderedModuleIds,
      );
      res.status(200).json({ success: true, data: modules });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(updateModuleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const mod = await modulesService.update(req.params.id, req.user.sub, req.user.role === 'ADMIN', req.body);
      res.status(200).json({ success: true, data: mod });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      await modulesService.remove(req.params.id, req.user.sub, req.user.role === 'ADMIN');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
