import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createDocument,
  listDocuments,
  getDocument,
  updateSection,
  submitForReview,
  submitReview,
  approveDocument,
  exportPdf,
  deleteDocument,
} from '../controllers/document.controller';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/',            createDocument);
router.get('/',             listDocuments);
router.get('/:docId',       getDocument);
router.patch('/:docId/sections/:sectionId', updateSection);
router.post('/:docId/submit',  submitForReview);
router.post('/:docId/review',  submitReview);
router.post('/:docId/approve', approveDocument);
router.get('/:docId/pdf',      exportPdf);
router.delete('/:docId',       deleteDocument);

export default router;
