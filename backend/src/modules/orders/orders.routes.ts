import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

const createOrderSchema = z.object({
  body: z.object({
    courseIds: z.array(z.string().uuid()).min(1),
    couponCode: z.string().optional(),
  }),
});

export const ordersService = {
  async create(userId: string, courseIds: string[], couponCode?: string) {
    const courses = await prisma.course.findMany({ where: { id: { in: courseIds }, status: 'PUBLISHED' } });
    if (courses.length !== courseIds.length) throw new AppError(404, 'One or more courses were not found');

    const alreadyEnrolled = await prisma.enrollment.findMany({
      where: { studentId: userId, courseId: { in: courseIds } },
    });
    if (alreadyEnrolled.length > 0) {
      throw new AppError(409, 'You are already enrolled in one or more of these courses');
    }

    let subtotal = courses.reduce((sum: number, c: any) => sum + Number(c.price), 0);
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon) throw new AppError(404, 'Invalid coupon code');
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError(410, 'This coupon has expired');
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new AppError(410, 'This coupon has been fully redeemed');

      if (coupon.discountPct) subtotal -= subtotal * (coupon.discountPct / 100);
      if (coupon.discountFlat) subtotal -= Number(coupon.discountFlat);
      subtotal = Math.max(0, subtotal);
      couponId = coupon.id;
    }

    return prisma.order.create({
      data: {
        userId,
        totalAmount: subtotal,
        couponId,
        items: { create: courses.map((c: any) => ({ courseId: c.id, price: c.price })) },
      },
      include: { items: { include: { course: true } } },
    });
  },

  async getById(orderId: string, userId: string, isAdmin: boolean) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { course: true } }, payment: true },
    });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.userId !== userId && !isAdmin) throw new AppError(403, 'Not your order');
    return order;
  },

  async myOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: { items: { include: { course: true } }, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  },
};

const router = Router();

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Create an order (cart checkout) for one or more paid courses, optionally with a coupon
 *     tags: [Orders]
 */
router.post('/', authenticate, authorize('STUDENT'), validate(createOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const order = await ordersService.create(req.user.sub, req.body.courseIds, req.body.couponCode);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, authorize('STUDENT'), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await ordersService.myOrders(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const order = await ordersService.getById(req.params.id, req.user.sub, req.user.role === 'ADMIN');
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

export default router;
