import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';

export const enrollmentsService = {
  async enroll(studentId: string, courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== 'PUBLISHED') throw new AppError(404, 'Course not found');

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (existing) throw new AppError(409, 'You are already enrolled in this course');

    if (!course.isFree) {
      throw new AppError(
        402,
        'This is a paid course. Please complete checkout via /orders and /payments before enrolling.',
      );
    }

    const [enrollment] = await prisma.$transaction([
      prisma.enrollment.create({ data: { studentId, courseId } }),
      prisma.course.update({ where: { id: courseId }, data: { totalStudents: { increment: 1 } } }),
    ]);

    return enrollment;
  },

  async myEnrollments(studentId: string) {
    return prisma.enrollment.findMany({
      where: { studentId },
      include: { course: { include: { category: true, instructor: { include: { profile: true } } } } },
      orderBy: { enrolledAt: 'desc' },
    });
  },

  async courseStudents(courseId: string, instructorId: string, isAdmin: boolean) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError(404, 'Course not found');
    if (course.instructorId !== instructorId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    return prisma.enrollment.findMany({
      where: { courseId },
      include: { student: { include: { profile: true } } },
      orderBy: { enrolledAt: 'desc' },
    });
  },

  async cancel(studentId: string, enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment || enrollment.studentId !== studentId) throw new AppError(404, 'Enrollment not found');
    return prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: 'CANCELLED' } });
  },
};

const router = Router();

/**
 * @openapi
 * /enrollments:
 *   post:
 *     summary: Enroll in a free course directly (paid courses go through /orders + /payments)
 *     tags: [Enrollments]
 */
router.post('/', authenticate, authorize('STUDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const enrollment = await enrollmentsService.enroll(req.user.sub, req.body.courseId);
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /enrollments/me:
 *   get:
 *     summary: List the current student's enrollments (My Courses)
 *     tags: [Enrollments]
 */
router.get('/me', authenticate, authorize('STUDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await enrollmentsService.myEnrollments(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/course/:courseId',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const data = await enrollmentsService.courseStudents(
        req.params.courseId,
        req.user.sub,
        req.user.role === 'ADMIN',
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize('STUDENT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const enrollment = await enrollmentsService.cancel(req.user.sub, req.params.id);
      res.status(200).json({ success: true, data: enrollment });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
