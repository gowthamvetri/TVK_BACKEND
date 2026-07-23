/**
 * Event Routes
 * @swagger
 * tags:
 *   name: Events
 *   description: Public events management
 */
import { Router } from 'express';
import eventController from './event.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize, authorizePermission } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import { body, param } from 'express-validator';
import upload from '../uploads/multer.config';
import { DEPUTY_PERMISSIONS } from '../../shared/constants';

const router = Router();

router.use(authenticate);

router.get('/', eventController.list);

router.get('/:id', [param('id').isMongoId()], validate, eventController.getById);

router.post(
  '/',
  authorize('mla', 'ward_councillor'),
  upload.array('images', 5),
  [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title is required (5-200 chars)'),
    body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Description is required (10-5000 chars)'),
    body('eventDate').isISO8601().toDate().withMessage('Valid eventDate is required for events'),
    body('venueName').trim().isLength({ min: 2, max: 200 }).withMessage('Venue name must be 2-200 chars'),
  ],
  validate,
  eventController.create
);

router.put(
  '/:id',
  authorize('mla', 'ward_councillor'),
  upload.array('images', 5),
  [
    param('id').isMongoId(),
    body('title').optional().trim().isLength({ min: 5, max: 200 }),
    body('description').optional().trim().isLength({ min: 10, max: 5000 }),
    body('eventDate').optional().isISO8601().toDate(),
    body('venueName').optional().trim().isLength({ min: 2, max: 200 }),
  ],
  validate,
  eventController.update
);

router.patch(
  '/:id/deactivate',
  authorizePermission(DEPUTY_PERMISSIONS.DELETE_EVENTS, 'mla'),
  [param('id').isMongoId()],
  validate,
  eventController.deactivate
);

export default router;
