/**
 * Dashboard Routes
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Role-specific dashboard data
 */
import { Router } from 'express';
import dashboardController from './dashboard.controller';
import authenticate from '../../shared/middlewares/authenticate';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get role-specific dashboard data
 *     security: [{ bearerAuth: [] }]
 *     description: Returns dashboard data tailored to the authenticated user's role
 */
router.get('/', dashboardController.getDashboard);

export default router;
