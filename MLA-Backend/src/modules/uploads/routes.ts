/**
 * Upload Routes
 * @swagger
 * tags:
 *   name: Uploads
 *   description: File upload management
 */
import { Router } from 'express';
import uploadController from './upload.controller';
import upload from './multer.config';
import authenticate from '../../shared/middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/single', upload.single('image'), uploadController.uploadSingle);
router.post('/multiple', upload.array('images', 5), uploadController.uploadMultiple);
router.delete('/', uploadController.deleteImage);

export default router;
