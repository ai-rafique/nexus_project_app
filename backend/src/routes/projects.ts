import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  addMember,
} from '../controllers/project.controller';

const router = Router();

router.use(requireAuth);

router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.post('/:id/members', addMember);

export default router;
