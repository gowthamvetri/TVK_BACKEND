/**
 * Complaint Routes
 * 
 * @swagger
 * tags:
 *   name: Complaints
 *   description: Complaint management and lifecycle
 */
import { Router, Request, Response, NextFunction } from 'express';
import complaintController from './complaint.controller';
import complaintValidators from './complaint.validators';
import authenticate from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import validate from '../../shared/middlewares/validate';
import upload from '../uploads/multer.config';

const router = Router();

const normalizeCreateBody = (req: Request, _res: Response, next: NextFunction) => {
  if (typeof req.body.location === 'string') {
    try {
      req.body.location = JSON.parse(req.body.location);
    } catch (error) {
      // Leave as-is; validator will handle invalid input
    }
  }

  if (req.body.location && typeof req.body.location.coordinates === 'string') {
    try {
      req.body.location.coordinates = JSON.parse(req.body.location.coordinates);
    } catch (error) {
      // Leave as-is; validator will handle invalid input
    }
  }

  next();
};

// All complaint routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /complaints:
 *   post:
 *     tags: [Complaints]
 *     summary: Create a new complaint
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/',
  authorize('citizen'),
  upload.array('images', 5),
  normalizeCreateBody,
  complaintValidators.create,
  validate,
  complaintController.createComplaint
);

/**
 * @swagger
 * /complaints:
 *   get:
 *     tags: [Complaints]
 *     summary: List complaints (filtered by role)
 */
router.get('/', complaintController.listComplaints);

/**
 * @swagger
 * /complaints/nearby:
 *   get:
 *     tags: [Complaints]
 *     summary: Get nearby complaints for duplicate detection
 */
router.get(
  '/nearby',
  complaintValidators.nearby,
  validate,
  complaintController.getNearbyComplaints
);

/**
 * @swagger
 * /complaints/track/{trackingId}:
 *   get:
 *     tags: [Complaints]
 *     summary: Track complaint by tracking ID
 */
router.get(
  '/track/:trackingId',
  complaintValidators.getByTrackingId,
  validate,
  complaintController.getComplaintByTrackingId
);

/**
 * @swagger
 * /complaints/{id}:
 *   get:
 *     tags: [Complaints]
 *     summary: Get complaint by ID
 */
router.get(
  '/:id',
  complaintValidators.getById,
  validate,
  complaintController.getComplaintById
);

/**
 * @swagger
 * /complaints/{id}/status:
 *   patch:
 *     tags: [Complaints]
 *     summary: Update complaint status
 */
router.patch(
  '/:id/status',
  authorize('service_officer', 'ward_councillor', 'mla'),
  complaintValidators.updateStatus,
  validate,
  complaintController.updateStatus
);

/**
 * @swagger
 * /complaints/{id}/resolution-proof:
 *   post:
 *     tags: [Complaints]
 *     summary: Add resolution proof images
 */
router.post(
  '/:id/resolution-proof',
  authorize('service_officer'),
  upload.array('proofImages', 5),
  complaintValidators.getById,
  validate,
  complaintController.addResolutionProof
);

/**
 * @swagger
 * /complaints/{id}/timeline:
 *   get:
 *     tags: [Complaints]
 *     summary: Get complaint status timeline
 */
router.get(
  '/:id/timeline',
  complaintValidators.getById,
  validate,
  complaintController.getTimeline
);

/**
 * @swagger
 * /complaints/{id}/upvote:
 *   post:
 *     tags: [Complaints]
 *     summary: Upvote a complaint
 */
router.post(
  '/:id/upvote',
  authorize('citizen'),
  complaintValidators.getById,
  validate,
  complaintController.upvoteComplaint
);

/**
 * @swagger
 * /complaints/{id}/upvote:
 *   delete:
 *     tags: [Complaints]
 *     summary: Remove upvote
 */
router.delete(
  '/:id/upvote',
  authorize('citizen'),
  complaintValidators.getById,
  validate,
  complaintController.removeUpvote
);

export default router;
