import { z } from 'zod';

export const createLessonSchema = z.object({
  body: z.object({
    moduleId: z.string().uuid(),
    title: z.string().min(1),
    order: z.number().int().min(0).default(0),
    contentType: z.enum(['video', 'pdf', 'slides', 'text']).default('video'),
    videoUrl: z.string().url().optional(),
    videoFormat: z.string().optional(),
    transcript: z.string().optional(),
    isPreview: z.boolean().default(false),
    durationSeconds: z.number().int().min(0).default(0),
  }),
});

export const updateLessonSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    order: z.number().int().min(0).optional(),
    transcript: z.string().optional(),
    isPreview: z.boolean().optional(),
    durationSeconds: z.number().int().min(0).optional(),
  }),
});

export const progressSchema = z.object({
  body: z.object({
    watchedSecs: z.number().int().min(0),
    lastPositionSecs: z.number().int().min(0),
    isCompleted: z.boolean().optional(),
  }),
});

export const addResourceSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    fileUrl: z.string().url(),
    fileType: z.string().min(1),
  }),
});

export const reorderLessonsSchema = z.object({
  body: z.object({
    moduleId: z.string().uuid(),
    orderedLessonIds: z.array(z.string().uuid()).min(1),
  }),
});
