/**
 * Scheme Routes
 * @swagger
 * tags:
 *   name: Schemes
 *   description: Government schemes & events
 */
import { Router } from 'express';
import schemeController from './scheme.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import { body, param } from 'express-validator';
import upload from '../uploads/multer.config';

const router = Router();

router.use(authenticate);

router.get('/', schemeController.list);
router.get('/:id', [param('id').isMongoId()], validate, schemeController.getById);

router.post(
  '/',
  authorize('mla', 'ward_councillor'),
  upload.array('images', 5),
  [
    body('title').trim().isLength({ min: 5, max: 200 }),
    body('description').trim().isLength({ min: 10, max: 5000 }),
    body('category').optional().isIn(['all', 'women', 'men', 'children', 'transgender_people', 'school_students', 'college_students', 'senior_citizens', 'people_with_disabilities']),
    body('requiredDocuments').optional().custom((value) => {
      if (typeof value === 'string') {
        try { JSON.parse(value); return true; } catch { throw new Error('Invalid JSON'); }
      }
      return Array.isArray(value);
    }),
    body('dynamicFields').optional().custom((value) => {
      if (typeof value === 'string') {
        try { JSON.parse(value); return true; } catch { throw new Error('Invalid JSON'); }
      }
      return Array.isArray(value);
    }),
  ],
  validate,
  schemeController.create
);

router.put(
  '/:id',
  authorize('mla', 'ward_councillor'),
  upload.array('images', 5),
  [
    param('id').isMongoId(),
    body('title').optional().trim().isLength({ min: 5, max: 200 }),
    body('description').optional().trim().isLength({ min: 10, max: 5000 }),
    body('category').optional().isIn(['all', 'women', 'men', 'children', 'transgender_people', 'school_students', 'college_students', 'senior_citizens', 'people_with_disabilities']),
    body('requiredDocuments').optional().custom((value) => {
      if (typeof value === 'string') {
        try { JSON.parse(value); return true; } catch { throw new Error('Invalid JSON'); }
      }
      return Array.isArray(value);
    }),
    body('dynamicFields').optional().custom((value) => {
      if (typeof value === 'string') {
        try { JSON.parse(value); return true; } catch { throw new Error('Invalid JSON'); }
      }
      return Array.isArray(value);
    }),
  ],
  validate,
  schemeController.update
);
router.patch('/:id/deactivate', authorize('mla'), [param('id').isMongoId()], validate, schemeController.deactivate);

export default router;
