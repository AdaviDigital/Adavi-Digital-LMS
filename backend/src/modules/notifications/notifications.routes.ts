import { Router, Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const mailTransport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

async function sendEmail(to: string, subject: string, html: string) {
  if (!mailTransport) {
    logger.warn('SMTP not configured — email skipped', { subject });
    return;
  }
  await mailTransport.sendMail({ from: env.MAIL_FROM, to, subject, html });
}

async function sendSms(_to: string, _message: string) {
  if (!env.SMS_API_KEY) {
    logger.warn('SMS_API_KEY not configured — SMS skipped');
    return;
  }
  // Integrate your SMS gateway of choice here (Termii, Twilio, etc.) using env.SMS_API_KEY.
}

async function sendWhatsApp(_to: string, _message: string) {
  if (!env.WHATSAPP_API_TOKEN) {
    logger.warn('WHATSAPP_API_TOKEN not configured — WhatsApp message skipped');
    return;
  }
  // Integrate WhatsApp Business Cloud API here using env.WHATSAPP_API_TOKEN.
}

export const notificationsService = {
  /**
   * Central dispatch used by other modules (enrollments, payments, certificates, assignments, etc.)
   * to notify a user across one or more channels while always recording an in-app notification.
   */
  async dispatch(
    userId: string,
    channels: Array<'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'IN_APP'>,
    title: string,
    body: string,
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    for (const channel of channels) {
      await prisma.notification.create({ data: { userId, channel, title, body } });
      if (channel === 'EMAIL') await sendEmail(user.email, title, `<p>${body}</p>`);
      if (channel === 'SMS' && user.phone) await sendSms(user.phone, body);
      if (channel === 'WHATSAPP' && user.phone) await sendWhatsApp(user.phone, body);
      // PUSH: integrate FCM/APNs token registry when the mobile app ships.
    }
  },

  async myNotifications(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  },

  async markRead(id: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) throw new AppError(404, 'Notification not found');
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  },
};

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await notificationsService.myNotifications(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const notif = await notificationsService.markRead(req.params.id, req.user.sub);
    res.status(200).json({ success: true, data: notif });
  } catch (err) {
    next(err);
  }
});

// Admin/system-triggered broadcast (e.g. platform announcements)
router.post('/broadcast', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userIds, channels, title, body } = req.body as {
      userIds: string[];
      channels: Array<'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'IN_APP'>;
      title: string;
      body: string;
    };
    await Promise.all(userIds.map((id) => notificationsService.dispatch(id, channels, title, body)));
    res.status(200).json({ success: true, message: `Notified ${userIds.length} user(s)` });
  } catch (err) {
    next(err);
  }
});

export default router;
