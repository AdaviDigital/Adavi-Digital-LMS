import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

const createReviewSchema = z.object({
  body: z.object({
    courseId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
  }),
});

async function recalculateAvgRating(courseId: string) {
  const agg = await prisma.review.aggregate({ where: { courseId }, _avg: { rating: true } });
  await prisma.course.update({ where: { id: courseId }, data: { avgRating: agg._avg.rating ?? 0 } });
}

export const reviewsService = {
  async create(studentId: string, input: { courseId: string; rating: number; comment?: string }) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: input.courseId } },
    });
    if (!enrollment) throw new AppError(403, 'Only enrolled students can review this course');

    const review = await prisma.review.upsert({
      where: { courseId_studentId: { courseId: input.courseId, studentId } },
      update: { rating: input.rating, comment: input.comment },
      create: { courseId: input.courseId, studentId, rating: input.rating, comment: input.comment },
    });

    await recalculateAvgRating(input.courseId);
    return review;
  },

  async forCourse(courseId: string) {
    return prisma.review.findMany({
      where: { courseId },
      include: { student: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },
};

const router = Router();

router.post('/', authenticate, authorize('STUDENT'), validate(createReviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const review = await reviewsService.create(req.user.sub, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
});

router.get('/course/:courseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await reviewsService.forCourse(req.params.courseId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
