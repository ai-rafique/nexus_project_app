import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getMatrix, addEntry, updateEntry, deleteEntry, autoPopulate, getSummary,
} from '../controllers/verification.controller';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get('/',                    getMatrix);
router.get('/summary',             getSummary);
router.post('/auto-populate',      autoPopulate);
router.post('/entries',            addEntry);
router.patch('/entries/:entryId',  updateEntry);
router.delete('/entries/:entryId', deleteEntry);

export default router;
