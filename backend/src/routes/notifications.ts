import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} from '../controllers/notification.controller';

const router = Router();

router.use(requireAuth);

router.get('/',                  listNotifications);
router.get('/unread-count',      unreadCount);
router.patch('/read-all',        markAllRead);
router.patch('/:id/read',        markRead);

export default router;
