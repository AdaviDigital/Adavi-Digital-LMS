import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}

const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    excerpt: z.string().max(300).optional(),
    content: z.string().min(10),
    coverUrl: z.string().url().optional(),
    published: z.boolean().default(false),
  }),
});

export const blogService = {
  async create(authorId: string, input: z.infer<typeof createPostSchema>['body']) {
    return prisma.blogPost.create({
      data: { ...input, authorId, slug: slugify(input.title) },
    });
  },

  async list(publishedOnly = true) {
    return prisma.blogPost.findMany({
      where: publishedOnly ? { published: true } : {},
      include: { author: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getBySlug(slug: string) {
    const post = await prisma.blogPost.findUnique({ where: { slug }, include: { author: { include: { profile: true } } } });
    if (!post || !post.published) throw new AppError(404, 'Blog post not found');
    return post;
  },

  async update(id: string, input: Partial<z.infer<typeof createPostSchema>['body']>) {
    return prisma.blogPost.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    await prisma.blogPost.delete({ where: { id } });
  },
};

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await blogService.list(true);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await blogService.getBySlug(req.params.slug);
    res.status(200).json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('ADMIN', 'INSTRUCTOR'), validate(createPostSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const post = await blogService.create(req.user.sub, req.body);
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, authorize('ADMIN', 'INSTRUCTOR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await blogService.update(req.params.id, req.body);
    res.status(200).json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await blogService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
