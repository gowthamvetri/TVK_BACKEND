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

const router = Router();

router.use(authenticate);

router.get('/', announcementController.list);

router.get('/:id', [param('id').isMongoId()], validate, announcementController.getById);

router.post(
  '/',
  authorize('mla', 'ward_councillor'),
  [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title is required (5-200 chars)'),
    body('body').trim().isLength({ min: 10, max: 5000 }).withMessage('Body is required (10-5000 chars)'),
    body('category').optional().isIn(['general', 'emergency', 'development', 'event', 'scheme', 'maintenance']),
    body('targetWards').optional().isArray(),
  ],
  validate,
  announcementController.create
);

router.put(
  '/:id',
  authorize('mla', 'ward_councillor'),
  [param('id').isMongoId()],
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
