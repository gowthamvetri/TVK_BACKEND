/**
 * Escalation Routes
 * 
 * @swagger
 * tags:
 *   name: Escalations
 *   description: Complaint escalation management
 */
import { Router } from 'express';
import escalationController from './escalation.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import { param, body } from 'express-validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('mla', 'ward_councillor'), escalationController.getEscalations);

router.post(
  '/:complaintId/escalate',
  authorize('mla', 'ward_councillor', 'service_officer'),
  [
    param('complaintId').isMongoId(),
    body('reason')
      .isIn(['sla_breach', 'inactivity', 'unresolved', 'manual', 'citizen_request'])
      .withMessage('Valid escalation reason is required'),
    body('notes').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  escalationController.escalateComplaint
);

router.patch(
  '/:id/resolve',
  authorize('mla', 'ward_councillor'),
  [param('id').isMongoId()],
  validate,
  escalationController.resolveEscalation
);

router.get(
  '/complaint/:complaintId',
  [param('complaintId').isMongoId()],
  validate,
  escalationController.getComplaintEscalations
);

export default router;
