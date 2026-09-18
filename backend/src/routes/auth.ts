import type { Request, Response } from 'express';
import { authController } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { loginLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils';
import { registerSchema, loginSchema, changePasswordSchema } from '../schemas';

const router = require('express').Router();

router.post('/register', validateBody(registerSchema), asyncHandler(authController.register));
router.post('/login', loginLimiter, validateBody(loginSchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', requireAuth, asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post('/change-password', requireAuth, validateBody(changePasswordSchema), asyncHandler(authController.changePassword));

export default router;
