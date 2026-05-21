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
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import { param, body } from 'express-validator';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user's profile
 *     security: [{ bearerAuth: [] }]
 */
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update current user's profile
 */
router.put('/profile', userController.updateProfile);

/**
 * @swagger
 * /users/fcm-token:
 *   patch:
 *     tags: [Users]
 *     summary: Update FCM push notification token
 */
router.patch(
  '/fcm-token',
  [body('fcmToken').notEmpty().withMessage('FCM token is required')],
  validate,
  userController.updateFCMToken
);

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 */
router.get('/', authorize('mla', 'ward_councillor'), userController.listUsers);

/**
 * @swagger
 * /users/ward/{ward}/officers:
 *   get:
 *     tags: [Users]
 *     summary: Get officers for a specific ward
 */
router.get(
  '/ward/:ward/officers',
  authorize('mla', 'ward_councillor'),
  [param('ward').isInt({ min: 1 })],
  validate,
  userController.getWardOfficers
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 */
router.get(
  '/:id',
  authorize('mla', 'ward_councillor'),
  [param('id').isMongoId()],
  validate,
  userController.getUserById
);

/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     tags: [Users]
 *     summary: Deactivate a user
 */
router.patch(
  '/:id/deactivate',
  authorize('mla'),
  [param('id').isMongoId()],
  validate,
  userController.deactivateUser
);

/**
 * @swagger
 * /users/{id}/activate:
 *   patch:
 *     tags: [Users]
 *     summary: Activate a user
 */
router.patch(
  '/:id/activate',
  authorize('mla'),
  [param('id').isMongoId()],
  validate,
  userController.activateUser
);

export default router;
