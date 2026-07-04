import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';

const ACCESS_TOKEN_TTL = env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'];
const REFRESH_TOKEN_TTL_DAYS = env.JWT_REFRESH_EXPIRES_DAYS;

function signAccessToken(userId: string, role: string, email: string) {
  return jwt.sign({ sub: userId, role, email }, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId: string) {
  const raw = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt },
  });
  return raw;
}

export const authService = {
  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'STUDENT' | 'INSTRUCTOR';
    phone?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        phone: input.phone,
        profile: {
          create: { firstName: input.firstName, lastName: input.lastName },
        },
      },
      include: { profile: true },
    });

    const accessToken = signAccessToken(user.id, user.role, user.email);
    const refreshToken = await issueRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (!user) throw new AppError(401, 'Invalid email or password');
    if (!user.isActive) throw new AppError(403, 'This account has been deactivated');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    const accessToken = signAccessToken(user.id, user.role, user.email);
    const refreshToken = await issueRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  },

  async refresh(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.refreshToken.findFirst({
      where: { tokenHash, revoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record) throw new AppError(401, 'Invalid or expired refresh token');

    // rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
    const newRefreshToken = await issueRefreshToken(record.userId);
    const accessToken = signAccessToken(record.user.id, record.user.role, record.user.email);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  },
};
