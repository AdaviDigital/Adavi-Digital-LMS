import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';

export const analyticsService = {
  async platformOverview() {
    const [totalUsers, totalStudents, totalInstructors, totalCourses, publishedCourses, totalEnrollments, revenueAgg] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
        prisma.course.count(),
        prisma.course.count({ where: { status: 'PUBLISHED' } }),
        prisma.enrollment.count(),
        prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
      ]);

    const completedEnrollments = await prisma.enrollment.count({ where: { status: 'COMPLETED' } });
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

    return {
      totalUsers,
      totalStudents,
      totalInstructors,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      completionRate: Number(completionRate.toFixed(2)),
      totalRevenue: revenueAgg._sum.amount ?? 0,
    };
  },

  async instructorOverview(instructorId: string) {
    const courses = await prisma.course.findMany({ where: { instructorId }, select: { id: true, totalStudents: true, avgRating: true } });
    const courseIds = courses.map((c: any) => c.id);

    const [revenueAgg, completedCount, totalEnrollments] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'SUCCESS', order: { items: { some: { courseId: { in: courseIds } } } } },
        _sum: { amount: true },
      }),
      prisma.enrollment.count({ where: { courseId: { in: courseIds }, status: 'COMPLETED' } }),
      prisma.enrollment.count({ where: { courseId: { in: courseIds } } }),
    ]);

    return {
      totalCourses: courses.length,
      totalStudents: courses.reduce((sum: number, c: any) => sum + c.totalStudents, 0),
      avgRating: courses.length ? courses.reduce((sum: number, c: any) => sum + Number(c.avgRating), 0) / courses.length : 0,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      completionRate: totalEnrollments > 0 ? Number(((completedCount / totalEnrollments) * 100).toFixed(2)) : 0,
    };
  },

  async courseEngagement(courseId: string, requesterId: string, isAdmin: boolean) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError(404, 'Course not found');
    if (course.instructorId !== requesterId && !isAdmin) throw new AppError(403, 'You do not own this course');

    const [enrollments, avgProgress] = await Promise.all([
      prisma.enrollment.count({ where: { courseId } }),
      prisma.enrollment.aggregate({ where: { courseId }, _avg: { progressPc: true } }),
    ]);

    return {
      totalEnrollments: enrollments,
      avgProgressPc: Number((avgProgress._avg.progressPc ?? 0).toFixed(2)),
      totalStudents: course.totalStudents,
      avgRating: course.avgRating,
    };
  },
};

const router = Router();

router.get('/platform', authenticate, authorize('ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.platformOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/instructor/me', authenticate, authorize('INSTRUCTOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await analyticsService.instructorOverview(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/course/:courseId', authenticate, authorize('INSTRUCTOR', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await analyticsService.courseEngagement(req.params.courseId, req.user.sub, req.user.role === 'ADMIN');
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
