import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * For genuinely required, security-sensitive values (JWT secrets, DB URL): in production this
 * throws immediately if missing — there is NO fallback, ever, regardless of what's passed in.
 * A previous version of this file accepted a `fallback` for "required" secrets, which meant a
 * misconfigured production deployment would boot silently and sign real user sessions with a
 * hardcoded placeholder secret instead of failing loudly. That is the failure mode this function
 * exists to prevent, so the two must never be conflated again.
 *
 * In development only, a fallback may be used to keep local setup friction-free.
 */
function requiredSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) return value;
  if (!IS_PRODUCTION) return devFallback;
  throw new Error(
    `Missing required environment variable: ${name}. Refusing to start in production without it.`,
  );
}

function requiredValue(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) return value;
  if (!IS_PRODUCTION) return devFallback;
  throw new Error(
    `Missing required environment variable: ${name}. Refusing to start in production without it.`,
  );
}

function assertSecretStrength(name: string, value: string) {
  if (IS_PRODUCTION && value.length < 32) {
    throw new Error(
      `${name} is only ${value.length} characters — use at least 32 (e.g. \`openssl rand -hex 32\`) in production.`,
    );
  }
}

const jwtAccessSecret = requiredSecret('JWT_ACCESS_SECRET', 'dev_access_secret_change_me');
const jwtRefreshSecret = requiredSecret('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me');
assertSecretStrength('JWT_ACCESS_SECRET', jwtAccessSecret);
assertSecretStrength('JWT_REFRESH_SECRET', jwtRefreshSecret);
if (IS_PRODUCTION && jwtAccessSecret === jwtRefreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values in production.');
}

export const env = {
  NODE_ENV,
  IS_PRODUCTION,
  PORT: parseInt(process.env.PORT || '4000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  DATABASE_URL: requiredValue('DATABASE_URL', 'postgresql://user:pass@localhost:5432/adavi'),
  REDIS_URL: process.env.REDIS_URL || '', // empty = Redis disabled; app degrades gracefully

  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES_DAYS: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7', 10),

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'gpt-4o-mini',

  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY || '',
  FLUTTERWAVE_WEBHOOK_HASH: process.env.FLUTTERWAVE_WEBHOOK_HASH || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID || '',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'no-reply@adavidigitalinstitute.com',

  WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN || '',
  SMS_API_KEY: process.env.SMS_API_KEY || '',

  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB || '500', 10),

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),

  SENTRY_DSN: process.env.SENTRY_DSN || '',
};
