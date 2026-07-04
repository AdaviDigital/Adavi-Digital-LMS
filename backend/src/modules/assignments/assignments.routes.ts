import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

const createSchema = z.object({
  body: z.object({
    lessonId: z.string().uuid(),
    title: z.string().min(1),
    instructions: z.string().min(1),
    maxScore: z.number().int().min(1).default(100),
    dueDate: z.string().datetime().optional(),
  }),
});

const submitSchema = z.object({
  body: z.object({
    fileUrl: z.string().url().optional(),
    linkUrl: z.string().url().optional(),
    comment: z.string().optional(),
  }),
});

const gradeSchema = z.object({
  body: z.object({
    score: z.number().int().min(0),
    feedback: z.string().optional(),
  }),
});

async function assertOwnsLessonCourse(lessonId: string, userId: string, isAdmin: boolean) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new AppError(404, 'Lesson not found');
  if (lesson.module.course.instructorId !== userId && !isAdmin) {
    throw new AppError(403, 'You do not own this course');
  }
  return lesson;
}

export const assignmentsService = {
  async create(userId: string, isAdmin: boolean, input: any) {
    await assertOwnsLessonCourse(input.lessonId, userId, isAdmin);
    return prisma.assignment.create({
      data: {
        lessonId: input.lessonId,
        title: input.title,
        instructions: input.instructions,
        maxScore: input.maxScore,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      },
    });
  },

  async submit(assignmentId: string, studentId: string, input: any) {
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new AppError(404, 'Assignment not found');
    if (!input.fileUrl && !input.linkUrl) {
      throw new AppError(422, 'Submit a file, PDF, project link, or link URL');
    }
    return prisma.assignmentSubmission.create({
      data: { assignmentId, studentId, ...input },
    });
  },

  async grade(submissionId: string, instructorId: string, isAdmin: boolean, input: { score: number; feedback?: string }) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { lesson: { include: { module: { include: { course: true } } } } } } },
    });
    if (!submission) throw new AppError(404, 'Submission not found');
    if (submission.assignment.lesson.module.course.instructorId !== instructorId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { score: input.score, feedback: input.feedback, status: 'GRADED', gradedAt: new Date() },
    });
  },

  async mySubmissions(studentId: string) {
    return prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: { assignment: true },
      orderBy: { submittedAt: 'desc' },
    });
  },

  async submissionsForAssignment(assignmentId: string, instructorId: string, isAdmin: boolean) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { lesson: { include: { module: { include: { course: true } } } } },
    });
    if (!assignment) throw new AppError(404, 'Assignment not found');
    if (assignment.lesson.module.course.instructorId !== instructorId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    return prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { student: { include: { profile: true } } },
    });
  },
};

const router = Router();

router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN'), validate(createSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const assignment = await assignmentsService.create(req.user.sub, req.user.role === 'ADMIN', req.body);
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/submit',
  authenticate,
  authorize('STUDENT'),
  validate(submitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const submission = await assignmentsService.submit(req.params.id, req.user.sub, req.body);
      res.status(201).json({ success: true, data: submission });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/me', authenticate, authorize('STUDENT'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await assignmentsService.mySubmissions(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/submissions', authenticate, authorize('INSTRUCTOR', 'ADMIN'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await assignmentsService.submissionsForAssignment(
      req.params.id,
      req.user.sub,
      req.user.role === 'ADMIN',
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/submissions/:submissionId/grade',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(gradeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const submission = await assignmentsService.grade(
        req.params.submissionId,
        req.user.sub,
        req.user.role === 'ADMIN',
        req.body,
      );
      res.status(200).json({ success: true, data: submission });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
