import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

const questionSchema = z.object({
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY', 'MATCHING', 'DRAG_DROP', 'FILL_BLANK']),
  text: z.string().min(1),
  points: z.number().int().min(1).default(1),
  answers: z
    .array(z.object({ text: z.string().min(1), isCorrect: z.boolean().default(false) }))
    .default([]),
});

const createExamSchema = z.object({
  body: z.object({
    courseId: z.string().uuid(),
    title: z.string().min(1),
    timeLimitSecs: z.number().int().min(60),
    passScore: z.number().int().min(0).max(100).default(70),
    randomize: z.boolean().default(true),
    retakeAllowed: z.boolean().default(false),
    maxRetakes: z.number().int().min(0).default(0),
    questions: z.array(questionSchema).min(1),
  }),
});

const submitExamSchema = z.object({
  body: z.object({
    answers: z.record(z.string(), z.string()),
    flaggedEvents: z.number().int().min(0).default(0), // e.g. tab-switch / focus-loss count from client anti-cheat hook
  }),
});

export const examsService = {
  async create(userId: string, isAdmin: boolean, input: z.infer<typeof createExamSchema>['body']) {
    const course = await prisma.course.findUnique({ where: { id: input.courseId } });
    if (!course) throw new AppError(404, 'Course not found');
    if (course.instructorId !== userId && !isAdmin) throw new AppError(403, 'You do not own this course');

    return prisma.exam.create({
      data: {
        courseId: input.courseId,
        title: input.title,
        timeLimitSecs: input.timeLimitSecs,
        passScore: input.passScore,
        randomize: input.randomize,
        retakeAllowed: input.retakeAllowed,
        maxRetakes: input.maxRetakes,
        questions: {
          create: input.questions.map((q) => ({
            type: q.type,
            text: q.text,
            points: q.points,
            answers: { create: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })) },
          })),
        },
      },
      include: { questions: { include: { answers: true } } },
    });
  },

  async start(examId: string, studentId: string) {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new AppError(404, 'Exam not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: exam.courseId } },
    });
    if (!enrollment) throw new AppError(403, 'You must be enrolled to sit this exam');

    const priorAttempts = await prisma.examResult.count({ where: { examId, studentId } });
    if (priorAttempts > 0 && !exam.retakeAllowed) {
      throw new AppError(403, 'Retakes are not permitted for this exam');
    }
    if (priorAttempts > exam.maxRetakes) {
      throw new AppError(403, 'Maximum retake attempts exceeded');
    }

    const questions = await prisma.question.findMany({
      where: { examId },
      include: { answers: { select: { id: true, text: true } } }, // isCorrect hidden
    });
    const orderedQuestions = exam.randomize ? [...questions].sort(() => Math.random() - 0.5) : questions;

    const result = await prisma.examResult.create({
      data: { examId, studentId, score: 0, attemptNo: priorAttempts + 1, status: 'IN_PROGRESS' },
    });

    return { examResultId: result.id, timeLimitSecs: exam.timeLimitSecs, questions: orderedQuestions };
  },

  async submit(examResultId: string, studentId: string, answers: Record<string, string>, flaggedEvents: number) {
    const result = await prisma.examResult.findUnique({ where: { id: examResultId }, include: { exam: true } });
    if (!result || result.studentId !== studentId) throw new AppError(404, 'Exam attempt not found');
    if (result.status !== 'IN_PROGRESS') throw new AppError(409, 'This exam attempt was already submitted');

    const questions = await prisma.question.findMany({ where: { examId: result.examId }, include: { answers: true } });

    let totalPoints = 0;
    let earnedPoints = 0;
    for (const q of questions) {
      totalPoints += q.points;
      const correctAnswer = q.answers.find((a: any) => a.isCorrect);
      if (correctAnswer && answers[q.id] === correctAnswer.id) earnedPoints += q.points;
    }
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= result.exam.passScore;

    return prisma.examResult.update({
      where: { id: examResultId },
      data: {
        score,
        passed,
        status: flaggedEvents > 3 ? 'FLAGGED' : 'GRADED',
        submittedAt: new Date(),
      },
    });
  },

  async myResults(studentId: string, examId: string) {
    return prisma.examResult.findMany({ where: { studentId, examId }, orderBy: { startedAt: 'desc' } });
  },
};

const router = Router();

router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN'), validate(createExamSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const exam = await examsService.create(req.user.sub, req.user.role === 'ADMIN', req.body);
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', authenticate, authorize('STUDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await examsService.start(req.params.id, req.user.sub);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/results/:resultId/submit',
  authenticate,
  authorize('STUDENT'),
  validate(submitExamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const result = await examsService.submit(
        req.params.resultId,
        req.user.sub,
        req.body.answers,
        req.body.flaggedEvents,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id/my-results', authenticate, authorize('STUDENT'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await examsService.myResults(req.user.sub, req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
