/**
 * Official Registry Routes
 *
 * @swagger
 * tags:
 *   name: Officials
 *   description: Pre-registered official roles for onboarding
 */
import { Router } from 'express';
import officialsController from './officials.controller';
import officialsValidators from './officials.validators';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import csvUpload from './csvUpload.config';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /officials/upload-csv:
 *   post:
 *     tags: [Officials]
 *     summary: Upload a CSV of official phone numbers and roles
 *     security: [{ bearerAuth: [] }]
 */
router.post(
	'/upload-csv',
	authorize('mla'),
	csvUpload.any(),
	officialsValidators.uploadCsv,
	validate,
	officialsController.uploadCsv
);

export default router;
