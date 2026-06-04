/**
 * Scheme Application Routes
 * @swagger
 * tags:
 *   name: SchemeApplications
 *   description: Citizen applications for schemes
 */
import { Router } from 'express';
import schemeApplicationController from './scheme-application.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import { body, param } from 'express-validator';
import upload from '../uploads/multer.config';

const router = Router();

router.use(authenticate);

router.get('/my-applications', schemeApplicationController.listMyApplications);

router.get('/scheme/:schemeId', authorize('mla', 'ward_councillor'), [param('schemeId').isMongoId()], validate, schemeApplicationController.listSchemeApplications);

router.get('/scheme/:schemeId/export', authorize('mla', 'ward_councillor'), [param('schemeId').isMongoId()], validate, schemeApplicationController.exportApplications);

router.get('/:id', [param('id').isMongoId()], validate, schemeApplicationController.getById);

router.post(
  '/',
  upload.array('documents', 10), // Maximum 10 documents
  [
    body('schemeId').isMongoId().withMessage('Valid schemeId is required'),
    body('documentNames').optional(), // Array of strings or JSON stringified array matching the file uploads
    body('applicationData').optional(),
  ],
  validate,
  schemeApplicationController.apply
);

router.patch(
  '/:id/status',
  authorize('mla', 'ward_councillor'),
  [
    param('id').isMongoId(),
    body('status').isIn(['pending', 'approved', 'rejected']),
    body('remarks').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  schemeApplicationController.updateStatus
);

export default router;
