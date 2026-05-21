/**
 * Report Routes
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report generation (PDF/CSV)
 */
import { Router } from 'express';
import reportController from './report.controller';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('mla', 'ward_councillor'));

router.get('/complaints/csv', reportController.downloadCSV);
router.get('/complaints/pdf', reportController.downloadPDF);

export default router;
