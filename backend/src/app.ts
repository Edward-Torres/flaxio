import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requireAuth } from './middleware/auth';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler, notFound } from './middleware/errors';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    })
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        const allowed = env.CORS_ORIGIN.split(',').map((o) => o.trim());
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
        const isLan = /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin || '');
        if (!origin || allowed.includes(origin) || isLocalhost || isLan) {
          return cb(null, true);
        }
        return cb(new Error('Origen no permitido por CORS.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use('/api', generalLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', requireAuth, adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
