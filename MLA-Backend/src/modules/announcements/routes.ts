/**
 * Announcement Routes
 * @swagger
 * tags:
 *   name: Announcements
 *   description: Public announcements management
 */
import { Router } from 'express';
import announcementController from './announcement.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import { body, param } from 'express-validator';
import upload from '../uploads/multer.config';

const router = Router();

router.use(authenticate);

router.get('/', announcementController.list);

router.get('/:id', [param('id').isMongoId()], validate, announcementController.getById);

router.post(
  '/',
  authorize('mla', 'ward_councillor'),
  upload.array('images', 5),
  [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title is required (5-200 chars)'),
    body('body').trim().isLength({ min: 10, max: 5000 }).withMessage('Body is required (10-5000 chars)'),
    body('category').optional().isIn(['general', 'emergency', 'development', 'scheme', 'maintenance', 'announcement']),
    body('targetWards').optional().custom((value) => {
      // Support array of numbers, or stringified array (from FormData)
      if (typeof value === 'string') {
        try { JSON.parse(value); return true; } catch { throw new Error('targetWards must be an array'); }
      }
      return Array.isArray(value);
    }),
    body('publishDate').optional().isISO8601().toDate().withMessage('Valid publishDate is required'),
  ],
  validate,
  announcementController.create
);

router.put(
  '/:id',
  authorize('mla', 'ward_councillor'),
  upload.array('images', 5),
  [
    param('id').isMongoId(),
    body('category').optional().isIn(['general', 'emergency', 'development', 'scheme', 'maintenance', 'announcement']),
    body('publishDate').optional().isISO8601().toDate(),
  ],
  validate,
  announcementController.update
);

router.patch(
  '/:id/deactivate',
  authorize('mla'),
  [param('id').isMongoId()],
  validate,
  announcementController.deactivate
);

export default router;
