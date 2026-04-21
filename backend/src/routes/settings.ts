import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import {
  getSettings,
  updateSettings,
  uploadLogo,
  deleteLogo,
  getLogo,
} from '../controllers/settings.controller';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo${ext}`);
  },
});

const upload = multer({
  storage,
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

router.get('/',            getSettings);
router.patch('/',          updateSettings);
router.post('/logo',       upload.single('logo'), uploadLogo);
router.delete('/logo',     deleteLogo);
router.get('/logo',        getLogo);

export default router;
