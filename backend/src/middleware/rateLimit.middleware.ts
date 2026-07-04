import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env';
import { redis, redisEnabled } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Rate limiting needs a shared counter across all running instances to actually work — an
 * in-memory store (the express-rate-limit default) only counts requests hitting that one
 * process. Behind a load balancer with 2+ instances (the normal production topology on
 * Render, most PaaS platforms, or a multi-container VPS setup), each instance would allow
 * the full limit independently, silently multiplying the effective limit by instance count.
 * We use Redis as a shared store when available, and fall back to the in-memory default
 * (with a log line explaining the reduced guarantee) when it isn't — e.g. local development,
 * or a deployment target without Redis.
 */
function buildStore(prefix: string) {
  if (!redisEnabled || !redis) {
    logger.warn(
      `Rate limiter "${prefix}" is using in-memory storage (no REDIS_URL set) — limits are ` +
        'per-instance only and will not hold under horizontal scaling.',
    );
    return undefined;
  }
  const client = redis;
  return new RedisStore({
    sendCommand: async (...args: string[]) => client.call(...(args as [string, ...string[]])) as any,
    prefix: `ratelimit:${prefix}:`,
  });
}

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('api'),
  message: { success: false, message: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('auth'),
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});
