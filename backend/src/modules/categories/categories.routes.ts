import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    iconUrl: z.string().url().optional(),
  }),
});

export const categoriesService = {
  async list() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },
  async create(input: z.infer<typeof createCategorySchema>['body']) {
    return prisma.category.create({ data: { ...input, slug: slugify(input.name) } });
  },
  async remove(id: string) {
    await prisma.category.delete({ where: { id } });
  },
};

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await categoriesService.list();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('ADMIN'), validate(createCategorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await categoriesService.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await categoriesService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
