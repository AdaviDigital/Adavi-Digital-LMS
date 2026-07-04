import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

const createCouponSchema = z.object({
  body: z
    .object({
      code: z.string().min(3).toUpperCase(),
      courseId: z.string().uuid().optional(),
      discountPct: z.number().int().min(1).max(100).optional(),
      discountFlat: z.number().min(0).optional(),
      maxUses: z.number().int().min(1).optional(),
      expiresAt: z.string().datetime().optional(),
    })
    .refine((d) => d.discountPct || d.discountFlat, {
      message: 'Provide either discountPct or discountFlat',
    }),
});

export const couponsService = {
  async create(input: z.infer<typeof createCouponSchema>['body']) {
    return prisma.coupon.create({
      data: {
        code: input.code,
        courseId: input.courseId,
        discountPct: input.discountPct,
        discountFlat: input.discountFlat,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
    });
  },

  async list() {
    return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async validate(code: string) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new AppError(404, 'Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError(410, 'This coupon has expired');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new AppError(410, 'This coupon has been fully redeemed');
    return coupon;
  },

  async remove(id: string) {
    await prisma.coupon.delete({ where: { id } });
  },
};

const router = Router();

router.post('/', authenticate, authorize('ADMIN'), validate(createCouponSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponsService.create(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, authorize('ADMIN'), async (_req, res, next) => {
  try {
    const data = await couponsService.list();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/validate/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await couponsService.validate(req.params.code);
    res.status(200).json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await couponsService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
