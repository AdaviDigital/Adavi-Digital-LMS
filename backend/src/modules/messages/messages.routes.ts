import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';

const sendSchema = z.object({
  body: z.object({
    recipientId: z.string().uuid(),
    body: z.string().min(1).max(5000),
  }),
});

export const messagesService = {
  async send(senderId: string, recipientId: string, body: string) {
    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) throw new AppError(404, 'Recipient not found');
    return prisma.message.create({ data: { senderId, recipientId, body } });
  },

  async conversation(userId: string, otherUserId: string) {
    return prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async inbox(userId: string) {
    return prisma.message.findMany({
      where: { recipientId: userId },
      include: { sender: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async markRead(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.recipientId !== userId) throw new AppError(404, 'Message not found');
    return prisma.message.update({ where: { id: messageId }, data: { isRead: true } });
  },
};

const router = Router();

router.post('/', authenticate, validate(sendSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const message = await messagesService.send(req.user.sub, req.body.recipientId, req.body.body);
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

router.get('/inbox', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await messagesService.inbox(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/conversation/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await messagesService.conversation(req.user.sub, req.params.userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const message = await messagesService.markRead(req.params.id, req.user.sub);
    res.status(200).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

export default router;
