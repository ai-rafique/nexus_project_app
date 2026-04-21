import { Router, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, logout, setup2fa, verify2fa, me } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

// Rate limiting only in production — dev/test runs many requests in quick succession
const authLimiter: RequestHandler = env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests, please try again later.' },
    })
  : (_req, _res, next) => next();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.post('/2fa/setup', requireAuth, setup2fa);
router.post('/2fa/verify', requireAuth, verify2fa);

export default router;
