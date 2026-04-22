import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import {
  getSettings,
  updateSettings,
  uploadLogo,
  deleteLogo,
  getLogo,
} from '../controllers/settings.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPEG, and SVG files are allowed'));
    }
  },
});

const router = Router();

router.use(requireAuth);

router.get('/',        getSettings);
router.patch('/',      updateSettings);
router.post('/logo',   upload.single('logo'), uploadLogo);
router.delete('/logo', deleteLogo);
router.get('/logo',    getLogo);

export default router;
