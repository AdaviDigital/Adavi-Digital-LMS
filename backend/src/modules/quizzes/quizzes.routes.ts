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
    .array(z.object({ text: z.string().min(1), isCorrect: z.boolean().default(false), matchKey: z.string().optional() }))
    .default([]),
});

const createQuizSchema = z.object({
  body: z.object({
    lessonId: z.string().uuid(),
    title: z.string().min(1),
    timeLimitSecs: z.number().int().min(0).optional(),
    passScore: z.number().int().min(0).max(100).default(70),
    randomize: z.boolean().default(false),
    questions: z.array(questionSchema).min(1),
  }),
});

const attemptSchema = z.object({
  body: z.object({
    // { questionId: answerId } for objective types, { questionId: freeText } for essay
    answers: z.record(z.string(), z.string()),
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

export const quizzesService = {
  async create(userId: string, isAdmin: boolean, input: z.infer<typeof createQuizSchema>['body']) {
    await assertOwnsLessonCourse(input.lessonId, userId, isAdmin);
    return prisma.quiz.create({
      data: {
        lessonId: input.lessonId,
        title: input.title,
        timeLimitSecs: input.timeLimitSecs,
        passScore: input.passScore,
        randomize: input.randomize,
        questions: {
          create: input.questions.map((q) => ({
            type: q.type,
            text: q.text,
            points: q.points,
            answers: { create: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect, matchKey: a.matchKey })) },
          })),
        },
      },
      include: { questions: { include: { answers: true } } },
    });
  },

  async getForAttempt(quizId: string, studentId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: { include: { module: true } },
        questions: {
          include: { answers: { select: { id: true, text: true, matchKey: true } } }, // hide isCorrect
        },
      },
    });
    if (!quiz) throw new AppError(404, 'Quiz not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: quiz.lesson.module.courseId } },
    });
    if (!enrollment) throw new AppError(403, 'You must be enrolled to take this quiz');

    const questions = quiz.randomize ? [...quiz.questions].sort(() => Math.random() - 0.5) : quiz.questions;
    return { ...quiz, questions };
  },

  async attempt(quizId: string, studentId: string, answers: Record<string, string>) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { answers: true } } },
    });
    if (!quiz) throw new AppError(404, 'Quiz not found');

    let totalPoints = 0;
    let earnedPoints = 0;
    let hasEssay = false;

    for (const q of quiz.questions) {
      totalPoints += q.points;
      if (q.type === 'ESSAY') {
        hasEssay = true;
        continue; // essay requires manual grading
      }
      const submittedAnswerId = answers[q.id];
      const correctAnswer = q.answers.find((a: any) => a.isCorrect);
      if (correctAnswer && submittedAnswerId === correctAnswer.id) {
        earnedPoints += q.points;
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = !hasEssay && score >= quiz.passScore;

    return prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        score,
        passed,
        answersJson: answers,
        submittedAt: new Date(),
      },
    });
  },

  async myAttempts(studentId: string, quizId: string) {
    return prisma.quizAttempt.findMany({ where: { studentId, quizId }, orderBy: { startedAt: 'desc' } });
  },
};

const router = Router();

/**
 * @openapi
 * /quizzes:
 *   post:
 *     summary: Create a quiz with questions (MCQ, True/False, Essay, Matching, Drag&Drop, Fill-blank)
 *     tags: [Quizzes]
 */
router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN'), validate(createQuizSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const quiz = await quizzesService.create(req.user.sub, req.user.role === 'ADMIN', req.body);
    res.status(201).json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/attempt', authenticate, authorize('STUDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const quiz = await quizzesService.getForAttempt(req.params.id, req.user.sub);
    res.status(200).json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/attempt',
  authenticate,
  authorize('STUDENT'),
  validate(attemptSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const result = await quizzesService.attempt(req.params.id, req.user.sub, req.body.answers);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/:id/my-attempts', authenticate, authorize('STUDENT'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await quizzesService.myAttempts(req.user.sub, req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
