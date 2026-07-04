import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { authenticate } from '../../middleware/auth.middleware';
import { env } from '../../config/env';

function generateCertificateNo() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ADAVI-${stamp}-${rand}`;
}

function signCertificate(certificateNo: string, studentId: string, courseId: string) {
  return crypto
    .createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`${certificateNo}:${studentId}:${courseId}`)
    .digest('hex');
}

export const certificatesService = {
  /**
   * Called automatically once a student's course progress hits 100% (see lessons.service).
   * Idempotent: returns the existing certificate if one was already issued.
   */
  async issueForCompletedCourse(studentId: string, courseId: string) {
    const existing = await prisma.certificate.findFirst({ where: { studentId, courseId } });
    if (existing) return existing;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.certificateOn) return null;

    const certificateNo = generateCertificateNo();
    const verificationUrl = `${env.CORS_ORIGIN}/verify-certificate/${certificateNo}`;
    const digitalSignature = signCertificate(certificateNo, studentId, courseId);
    const qrCodeUrl = await QRCode.toDataURL(verificationUrl);

    return prisma.certificate.create({
      data: { certificateNo, studentId, courseId, verificationUrl, digitalSignature, qrCodeUrl },
    });
  },

  async myCertificates(studentId: string) {
    return prisma.certificate.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { issuedAt: 'desc' },
    });
  },

  async verify(certificateNo: string) {
    const cert = await prisma.certificate.findUnique({
      where: { certificateNo },
      include: { student: { include: { profile: true } }, course: { include: { instructor: { include: { profile: true } } } } },
    });
    if (!cert) throw new AppError(404, 'Certificate not found or invalid');

    const expectedSignature = signCertificate(cert.certificateNo, cert.studentId, cert.courseId);
    const isValid = expectedSignature === cert.digitalSignature;

    return { valid: isValid, certificate: cert };
  },
};

const router = Router();

/**
 * @openapi
 * /certificates/me:
 *   get:
 *     summary: List the current student's earned certificates
 *     tags: [Certificates]
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    const data = await certificatesService.myCertificates(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /certificates/verify/{certificateNo}:
 *   get:
 *     summary: Publicly verify a certificate by its ID (no auth required)
 *     tags: [Certificates]
 */
router.get('/verify/:certificateNo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await certificatesService.verify(req.params.certificateNo);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
