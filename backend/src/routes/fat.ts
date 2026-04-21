import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listFatPlans, createFatPlan, getFatPlan,
  addFatItem, updateFatItem, signFatItem, getFatReport,
} from '../controllers/fat.controller';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get('/',                               listFatPlans);
router.post('/',                              createFatPlan);
router.get('/:planId',                        getFatPlan);
router.post('/:planId/items',                 addFatItem);
router.patch('/:planId/items/:itemId',        updateFatItem);
router.post('/:planId/items/:itemId/sign',    signFatItem);
router.get('/:planId/report',                 getFatReport);

export default router;
