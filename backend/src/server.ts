import { createApp } from './app';
import { env } from './config/env';
import { connectRedis, disconnectRedis } from './config/redis';
import { prisma } from './config/prisma';
import { logger } from './config/logger';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main() {
  const app = createApp();

  await connectRedis();

  const server = app.listen(env.PORT, () => {
    logger.info(`Adavi LMS API listening on port ${env.PORT}`, { env: env.NODE_ENV });
    logger.info(`Swagger docs available at /api-docs`);
  });

  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown`);

    // If connections don't close cleanly within the timeout, force-exit rather than hang the
    // deploy/restart indefinitely (a common cause of stuck rolling deploys on PaaS platforms).
    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async () => {
      try {
        await prisma.$disconnect();
        disconnectRedis();
        clearTimeout(forceExit);
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: (err as Error).message });
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Last line of defense: log with full context before the process would otherwise die
  // silently or in an inconsistent state. Both are genuine bugs if they ever fire — this is
  // observability for that, not a substitute for fixing the underlying error.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.stack : reason,
    });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception — exiting', { error: err.stack });
    // An uncaught exception means the process is in an unknown state; exit and let the
    // platform's process manager (Render, PM2, systemd, etc.) restart it cleanly.
    process.exit(1);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
