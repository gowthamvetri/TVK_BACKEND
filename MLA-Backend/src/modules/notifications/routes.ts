/**
 * Notification Routes
 * 
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notification management
 */
import { Router } from 'express';
import notificationController from './notification.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { param } from 'express-validator';
import validate from '../../shared/middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', [param('id').isMongoId()], validate, notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

export default router;
