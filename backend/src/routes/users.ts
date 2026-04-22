import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { listUsers, findByEmail, updateUser, getUserAvatar } from '../controllers/users.controller';

const router = Router();

router.use(requireAuth);

// Any authenticated user can look up another user by exact email (for adding to projects)
router.get('/by-email', findByEmail);

// Avatar for any user (no role restriction — needed for profile display)
router.get('/:id/avatar', getUserAvatar);

// Super admin only
router.get('/',    requireRole('super_admin'), listUsers);
router.patch('/:id', requireRole('super_admin'), updateUser);

export default router;
