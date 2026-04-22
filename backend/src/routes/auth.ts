import { Router, RequestHandler } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import {
  register, login, refresh, logout, setup2fa, verify2fa, me,
  updateProfile, updatePassword, uploadAvatar, deleteAvatar, getMyAvatar,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

const authLimiter: RequestHandler = env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests, please try again later.' },
    })
  : (_req, _res, next) => next();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPEG, GIF, WebP) are allowed'));
    }
  },
});

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.post('/refresh',  authLimiter, refresh);
router.post('/logout',   logout);
router.get('/me',        requireAuth, me);
router.post('/2fa/setup',   requireAuth, setup2fa);
router.post('/2fa/verify',  requireAuth, verify2fa);

router.patch('/profile',  requireAuth, updateProfile);
router.patch('/password',  requireAuth, updatePassword);
router.post('/avatar',    requireAuth, avatarUpload.single('avatar'), uploadAvatar);
router.delete('/avatar',  requireAuth, deleteAvatar);
router.get('/avatar',     requireAuth, getMyAvatar);

export default router;
