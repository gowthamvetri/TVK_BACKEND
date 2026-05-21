/**
 * Feedback Routes
 *
 * @swagger
 * tags:
 *   name: Feedback
 *   description: App feedback and suggestions
 */
import { Router } from 'express';
import feedbackController from './feedback.controller';
import feedbackValidators from './feedback.validators';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /feedback:
 *   post:
 *     tags: [Feedback]
 *     summary: Submit app feedback or suggestion
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', feedbackValidators.create, validate, feedbackController.create);

/**
 * @swagger
 * /feedback:
 *   get:
 *     tags: [Feedback]
 *     summary: List feedback (MLA only)
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', authorize('mla'), feedbackValidators.list, validate, feedbackController.list);

export default router;
