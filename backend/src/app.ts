import express, { Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import apiRoutes from './routes';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { swaggerSpec } from './config/swagger';
import { httpLogStream } from './config/logger';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      // Supports a comma-separated list so staging/preview domains can be added without a
      // code change — most deployments only need one origin, but this avoids a redeploy
      // later just to add a second frontend domain.
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(
    express.json({
      limit: '10mb',
      // Stash the raw request body so payment webhook handlers can verify gateway signatures
      // (Paystack/Stripe/Flutterwave all sign the *raw* bytes — a signature check against the
      // already-parsed-and-reserialized JSON object will not reliably match).
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
      stream: httpLogStream,
    }),
  );
  app.use(env.API_PREFIX, apiLimiter);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(env.API_PREFIX, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
