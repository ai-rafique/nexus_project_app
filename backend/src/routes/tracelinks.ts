import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listTraceLinks,
  createTraceLink,
  deleteTraceLink,
  getGraph,
  getCoverage,
} from '../controllers/tracelink.controller';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/tracelinks',                      listTraceLinks);
router.post('/tracelinks',                     createTraceLink);
router.delete('/tracelinks/:linkId',           deleteTraceLink);
router.get('/traceability/graph',              getGraph);
router.get('/traceability/coverage',           getCoverage);

export default router;
