import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

/**
 * Redis is optional infrastructure. Several deployment targets documented for this project
 * (Hostinger Business Hosting, a minimal Render free tier) don't provide it, and the app is
 * designed to degrade gracefully without it — caching becomes a no-op rather than a crash.
 * When REDIS_URL is unset, we skip creating a real client entirely instead of letting ioredis
 * retry-loop against a bad default connection string.
 */
export const redisEnabled = env.REDIS_URL.trim().length > 0;

export const redis = redisEnabled
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    })
  : null;

if (redis) {
  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });
  redis.on('connect', () => logger.info('Redis connected'));
}

export async function connectRedis(): Promise<void> {
  if (!redis) {
    logger.warn('REDIS_URL not set — starting without a cache layer (AI summary/recommendation caching disabled).');
    return;
  }
  try {
    await redis.connect();
  } catch (err) {
    logger.warn('Redis connection failed — continuing without cache', { error: (err as Error).message });
  }
}

export function disconnectRedis(): void {
  redis?.disconnect();
}
