/**
 * User Routes
 * 
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */
import { Router } from 'express';
import userController from './user.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize, authorizePermission } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import { param } from 'express-validator';
import { DEPUTY_PERMISSIONS } from '../../shared/constants';
import {
  createDeputyValidator,
  createOfficialValidator,
  updateDeputyPermissionsValidator,
  transferCouncillorValidator,
} from './deputy.validators';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * Profile endpoints
 */
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

/**
 * Vacant Wards Overview
 */
router.get(
  '/wards/vacant',
  authorizePermission(DEPUTY_PERMISSIONS.VIEW_VACANT_WARDS, 'ward_councillor'),
  userController.getVacantWards
);

/**
 * Deputy Management Endpoints
 */
router.post(
  '/deputies',
  authorizePermission(DEPUTY_PERMISSIONS.CREATE_DEPUTY),
  createDeputyValidator,
  validate,
  userController.createDeputy
);

router.get(
  '/deputies',
  authorizePermission(DEPUTY_PERMISSIONS.CREATE_DEPUTY),
  userController.listDeputies
);

router.patch(
  '/deputies/:id/permissions',
  authorizePermission(DEPUTY_PERMISSIONS.CREATE_DEPUTY),
  updateDeputyPermissionsValidator,
  validate,
  userController.updateDeputyPermissions
);

/**
 * Official Creation Endpoint (Supervisors & Councillors)
 */
router.post(
  '/officials',
  authorizePermission(DEPUTY_PERMISSIONS.CREATE_OFFICIALS),
  createOfficialValidator,
  validate,
  userController.createOfficial
);

/**
 * Councillor Transfer Endpoint
 */
router.post(
  '/councillors/:id/transfer',
  authorizePermission(DEPUTY_PERMISSIONS.TRANSFER_COUNCILLOR),
  transferCouncillorValidator,
  validate,
  userController.transferCouncillor
);

/**
 * List Users
 */
router.get(
  '/',
  authorizePermission(DEPUTY_PERMISSIONS.MANAGE_COUNCILLORS, 'ward_councillor'),
  userController.listUsers
);

/**
 * Ward Officers
 */
router.get(
  '/ward/:ward/officers',
  authorizePermission(DEPUTY_PERMISSIONS.MANAGE_SUPERVISORS, 'ward_councillor'),
  [param('ward').isInt({ min: 1 })],
  validate,
  userController.getWardOfficers
);

/**
 * Get User by ID
 */
router.get(
  '/:id',
  authorizePermission(DEPUTY_PERMISSIONS.MANAGE_COUNCILLORS, 'ward_councillor'),
  [param('id').isMongoId()],
  validate,
  userController.getUserById
);

/**
 * Deactivate / Activate User
 */
router.patch(
  '/:id/deactivate',
  authorizePermission(DEPUTY_PERMISSIONS.MANAGE_COUNCILLORS),
  [param('id').isMongoId()],
  validate,
  userController.deactivateUser
);

router.patch(
  '/:id/activate',
  authorizePermission(DEPUTY_PERMISSIONS.MANAGE_COUNCILLORS),
  [param('id').isMongoId()],
  validate,
  userController.activateUser
);

export default router;
