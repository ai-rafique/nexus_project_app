import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listTestCases, createTestCase, getTestCase,
  updateTestCase, deleteTestCase, addRun, getRuns,
} from '../controllers/testcase.controller';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get('/',                     listTestCases);
router.post('/',                    createTestCase);
router.get('/:testId',              getTestCase);
router.patch('/:testId',            updateTestCase);
router.delete('/:testId',           deleteTestCase);
router.post('/:testId/runs',        addRun);
router.get('/:testId/runs',         getRuns);

export default router;
