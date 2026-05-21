/**
 * Analytics Routes
 * @swagger
 * tags:
 *   name: Analytics
 *   description: KPI & analytics endpoints
 */
import { Router } from 'express';
import analyticsController from './analytics.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { param } from 'express-validator';
import validate from '../../shared/middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/constituency', authorize('mla'), analyticsController.getConstituencyKPIs);
router.get('/ward-comparison', authorize('mla'), analyticsController.getWardComparison);
router.get('/ward/:ward', authorize('mla', 'ward_councillor'), [param('ward').isInt({ min: 1 })], validate, analyticsController.getWardAnalytics);
router.get('/officer/:officerId', authorize('mla', 'ward_councillor'), [param('officerId').isMongoId()], validate, analyticsController.getOfficerAnalytics);

export default router;
