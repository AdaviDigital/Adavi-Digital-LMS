import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { getPaymentAdapter } from './providers';
import { verifyWebhookSignature } from './webhookVerification';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const initiateSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    provider: z.enum(['PAYSTACK', 'FLUTTERWAVE', 'STRIPE', 'PAYPAL']),
    installments: z.number().int().min(1).default(1),
  }),
});

export const paymentsService = {
  async initiate(userId: string, userEmail: string, input: { orderId: string; provider: string; installments: number }) {
    const order = await prisma.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.userId !== userId) throw new AppError(403, 'Not your order');
    if (order.status === 'SUCCESS') throw new AppError(409, 'This order has already been paid for');

    const reference = `ADAVI-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const adapter = getPaymentAdapter(input.provider);

    const amountKobo = Math.round(Number(order.totalAmount) * 100 / input.installments);
    const { authorizationUrl, providerReference } = await adapter.initialize({
      reference,
      amountKobo,
      currency: 'NGN',
      email: userEmail,
      callbackUrl: `${env.CORS_ORIGIN}/checkout/callback`,
      metadata: { orderId: order.id },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        provider: input.provider as any,
        reference: providerReference,
        amount: order.totalAmount,
        installments: input.installments,
        status: 'PENDING',
      },
    });

    return { authorizationUrl, paymentId: payment.id };
  },

  async verifyAndFulfil(provider: string, providerReference: string) {
    const adapter = getPaymentAdapter(provider);
    const result = await adapter.verify(providerReference);

    const payment = await prisma.payment.findUnique({ where: { reference: providerReference }, include: { order: true } });
    if (!payment) throw new AppError(404, 'Payment record not found for this reference');

    if (!result.success) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'FAILED' } });
      return { success: false };
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'SUCCESS' } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'SUCCESS' } });
      await tx.transaction.create({ data: { paymentId: payment.id, rawPayload: result.raw as any } });

      const items = await tx.orderItem.findMany({ where: { orderId: payment.orderId } });
      for (const item of items) {
        await tx.enrollment.upsert({
          where: { studentId_courseId: { studentId: payment.userId, courseId: item.courseId } },
          update: {},
          create: { studentId: payment.userId, courseId: item.courseId },
        });
        await tx.course.update({ where: { id: item.courseId }, data: { totalStudents: { increment: 1 } } });
      }

      if (payment.order.couponId) {
        await tx.coupon.update({ where: { id: payment.order.couponId }, data: { usedCount: { increment: 1 } } });
      }
    });

    return { success: true };
  },

  async refund(paymentId: string) {
    // Gateway-specific refund calls would be dispatched here via the same adapter registry.
    // Kept as an explicit admin-triggered action pending gateway refund-API credentials.
    return prisma.payment.update({ where: { id: paymentId }, data: { status: 'REFUNDED' } });
  },
};

const router = Router();

/**
 * @openapi
 * /payments/initiate:
 *   post:
 *     summary: Initiate payment for an order via Paystack, Flutterwave, Stripe, or PayPal
 *     tags: [Payments]
 */
router.post('/initiate', authenticate, authorize('STUDENT'), validate(initiateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await paymentsService.initiate(req.user.sub, req.user.email, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /payments/verify/{provider}/{reference}:
 *   get:
 *     summary: Verify a payment and fulfil the order (enroll student) — called from checkout callback
 *     tags: [Payments]
 */
router.get('/verify/:provider/:reference', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await paymentsService.verifyAndFulfil(req.params.provider, req.params.reference);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /payments/webhook/{provider}:
 *   post:
 *     summary: Gateway server-to-server webhook (Paystack/Flutterwave/Stripe/PayPal) — signature verification required per-provider before production use
 *     tags: [Payments]
 */
router.post('/webhook/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isValid = verifyWebhookSignature(req.params.provider, req.rawBody, req.headers as Record<string, string>);
    if (!isValid) {
      logger.warn('Rejected webhook with invalid or missing signature', {
        provider: req.params.provider,
        ip: req.ip,
      });
      // Deliberately vague response — don't tell an attacker *why* verification failed.
      return res.status(401).json({ received: false });
    }

    const reference = req.body?.data?.reference || req.body?.tx_ref || req.body?.id;
    if (reference) {
      await paymentsService.verifyAndFulfil(req.params.provider.toUpperCase(), reference);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/refund', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await paymentsService.refund(req.params.id);
    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
});

export default router;
