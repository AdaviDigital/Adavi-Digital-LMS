import { z } from 'zod';

export const listCoursesSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).optional(),
    language: z.string().optional(),
    priceType: z.enum(['free', 'paid']).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(['latest', 'popular', 'rating', 'price_asc', 'price_desc']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  }),
});

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    categoryId: z.string().uuid(),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).default('ALL_LEVELS'),
    language: z.string().default('English'),
    price: z.number().min(0).default(0),
    isFree: z.boolean().default(false),
    learningOutcomes: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional(),
    thumbnailUrl: z.string().url().optional(),
    promoVideoUrl: z.string().url().optional(),
  }),
});

export const updateCourseSchema = z.object({
  body: createCourseSchema.shape.body.partial(),
});
