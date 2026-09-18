import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones desde esta IP. Intentá más tarde.' },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req: Request, res) => {
    res.status(429).json({
      error: 'Demasiados intentos de login. Esperá 15 minutos antes de reintentar.',
    });
  },
});
