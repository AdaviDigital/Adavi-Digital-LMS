import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { redis } from '../../config/redis';
import { aiChatCompletion } from './ai.provider';

const chatSchema = z.object({
  body: z.object({
    lessonId: z.string().uuid().optional(),
    message: z.string().min(1).max(2000),
    history: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
      .max(20)
      .default([]),
  }),
});

const summarizeSchema = z.object({
  body: z.object({ lessonId: z.string().uuid() }),
});

const generateQuizSchema = z.object({
  body: z.object({
    lessonId: z.string().uuid(),
    numQuestions: z.number().int().min(1).max(20).default(5),
  }),
});

export const aiService = {
  async chat(lessonId: string | undefined, message: string, history: { role: 'user' | 'assistant'; content: string }[]) {
    let lessonContext = '';
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
      if (lesson?.transcript) lessonContext = `\n\nLesson transcript context:\n${lesson.transcript.slice(0, 4000)}`;
    }

    const reply = await aiChatCompletion([
      {
        role: 'system',
        content:
          `You are the Adavi Digital Institute AI Tutor. Be encouraging, clear, and concise. ` +
          `Answer using the lesson context when relevant.${lessonContext}`,
      },
      ...history,
      { role: 'user', content: message },
    ]);

    return { reply };
  },

  async summarizeLesson(lessonId: string) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new AppError(404, 'Lesson not found');
    if (lesson.aiSummary) return { summary: lesson.aiSummary, cached: true };

    const cacheKey = `ai:summary:${lessonId}`;
    const cached = redis ? await redis.get(cacheKey).catch(() => null) : null;
    if (cached) return { summary: cached, cached: true };

    if (!lesson.transcript) {
      throw new AppError(422, 'This lesson has no transcript available to summarize');
    }

    const summary = await aiChatCompletion([
      { role: 'system', content: 'Summarize the following lesson transcript in 4-6 concise bullet points for a student.' },
      { role: 'user', content: lesson.transcript.slice(0, 8000) },
    ]);

    await prisma.lesson.update({ where: { id: lessonId }, data: { aiSummary: summary } });
    await redis?.set(cacheKey, summary, 'EX', 60 * 60 * 24 * 7).catch(() => undefined);

    return { summary, cached: false };
  },

  async generateQuizDraft(instructorId: string, isAdmin: boolean, lessonId: string, numQuestions: number) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new AppError(404, 'Lesson not found');
    if (lesson.module.course.instructorId !== instructorId && !isAdmin) {
      throw new AppError(403, 'You do not own this course');
    }
    if (!lesson.transcript) throw new AppError(422, 'This lesson has no transcript to generate questions from');

    const raw = await aiChatCompletion(
      [
        {
          role: 'system',
          content:
            `Generate exactly ${numQuestions} multiple-choice quiz questions from the given lesson transcript. ` +
            `Respond ONLY with strict JSON, no markdown, no preamble, in this exact shape: ` +
            `{"questions":[{"text":"...","points":1,"answers":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false}]}]}`,
        },
        { role: 'user', content: lesson.transcript.slice(0, 8000) },
      ],
      { temperature: 0.3, maxTokens: 1500 },
    );

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { draft: parsed, lessonId };
    } catch {
      throw new AppError(502, 'AI returned an unexpected format. Please retry.');
    }
  },

  async recommendations(studentId: string) {
    const cacheKey = `ai:recs:${studentId}`;
    const cached = redis ? await redis.get(cacheKey).catch(() => null) : null;
    if (cached) return JSON.parse(cached);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: { course: { include: { category: true } } },
    });
    const categoryIds = [...new Set(enrollments.map((e: any) => e.course.categoryId))];

    const recommended = await prisma.course.findMany({
      where: {
        status: 'PUBLISHED',
        categoryId: { in: categoryIds.length ? categoryIds : undefined },
        id: { notIn: enrollments.map((e: any) => e.courseId) },
      },
      orderBy: [{ avgRating: 'desc' }, { totalStudents: 'desc' }],
      take: 8,
      include: { category: true },
    });

    await prisma.aIRecommendation.create({ data: { studentId, payload: recommended as any } });
    await redis?.set(cacheKey, JSON.stringify(recommended), 'EX', 60 * 60 * 6).catch(() => undefined);

    return recommended;
  },
};

const router = Router();

/**
 * @openapi
 * /ai/chat:
 *   post:
 *     summary: AI Chat Tutor — lesson-context-aware conversational help
 *     tags: [AI]
 */
router.post('/chat', authenticate, validate(chatSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await aiService.chat(req.body.lessonId, req.body.message, req.body.history);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /ai/summarize:
 *   post:
 *     summary: Generate (and cache) an AI summary of a lesson transcript
 *     tags: [AI]
 */
router.post('/summarize', authenticate, validate(summarizeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await aiService.summarizeLesson(req.body.lessonId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /ai/generate-quiz:
 *   post:
 *     summary: Instructor tool — AI-draft multiple-choice questions from a lesson transcript
 *     tags: [AI]
 */
router.post(
  '/generate-quiz',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(generateQuizSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const data = await aiService.generateQuizDraft(
        req.user.sub,
        req.user.role === 'ADMIN',
        req.body.lessonId,
        req.body.numQuestions,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /ai/recommendations:
 *   get:
 *     summary: AI-personalized course recommendations for the current student
 *     tags: [AI]
 */
router.get('/recommendations', authenticate, authorize('STUDENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await aiService.recommendations(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
