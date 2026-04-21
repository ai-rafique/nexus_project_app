import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { search } from '../controllers/search.controller';

const router = Router();
router.use(requireAuth);
router.get('/', search);

export default router;
