/**
 * Assignment Routes
 * 
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Complaint assignment management
 */
import { Router } from 'express';
import assignmentController from './assignment.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import { param, body } from 'express-validator';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /assignments/{complaintId}/reassign:
 *   post:
 *     tags: [Assignments]
 *     summary: Reassign a complaint to a different officer
 */
router.post(
  '/:complaintId/reassign',
  authorize('mla', 'ward_councillor'),
  [
    param('complaintId').isMongoId(),
    body('officerId').isMongoId().withMessage('Valid officer ID is required'),
    body('reason').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  assignmentController.reassign
);

/**
 * @swagger
 * /assignments/officer/{officerId}/workload:
 *   get:
 *     tags: [Assignments]
 *     summary: Get officer workload statistics
 */
router.get(
  '/officer/:officerId/workload',
  authorize('mla', 'ward_councillor'),
  [param('officerId').isMongoId()],
  validate,
  assignmentController.getOfficerWorkload
);

export default router;
