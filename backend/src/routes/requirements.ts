import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import {
  listRequirements,
  createRequirement,
  getRequirement,
  updateRequirement,
  deleteRequirement,
  addComment,
  importRequirements,
} from '../controllers/requirement.controller';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

router.get('/',    listRequirements);
router.post('/',   createRequirement);
router.post('/import', upload.single('file'), importRequirements);
router.get('/:reqId',    getRequirement);
router.patch('/:reqId',  updateRequirement);
router.delete('/:reqId', deleteRequirement);
router.post('/:reqId/comments', addComment);

export default router;
