import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

const createFaqSchema = z.object({
  body: z.object({
    question: z.string().min(3),
    answer: z.string().min(3),
    category: z.string().optional(),
    order: z.number().int().min(0).default(0),
  }),
});

export const faqService = {
  async list() {
    return prisma.fAQ.findMany({ orderBy: { order: 'asc' } });
  },
  async create(input: z.infer<typeof createFaqSchema>['body']) {
    return prisma.fAQ.create({ data: input });
  },
  async update(id: string, input: Partial<z.infer<typeof createFaqSchema>['body']>) {
    return prisma.fAQ.update({ where: { id }, data: input });
  },
  async remove(id: string) {
    await prisma.fAQ.delete({ where: { id } });
  },
};

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await faqService.list();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('ADMIN'), validate(createFaqSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const faq = await faqService.create(req.body);
    res.status(201).json({ success: true, data: faq });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const faq = await faqService.update(req.params.id, req.body);
    res.status(200).json({ success: true, data: faq });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await faqService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
