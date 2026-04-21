import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getProjectAudit, getGlobalAudit } from '../controllers/audit.controller';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get('/', getProjectAudit);

export { getGlobalAudit };
export default router;
