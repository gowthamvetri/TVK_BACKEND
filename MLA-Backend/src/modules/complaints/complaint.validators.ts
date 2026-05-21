/**
 * Complaint Validators
 */
import { body, param, query } from 'express-validator';
import { COMPLAINT_STATUS, COMPLAINT_PRIORITY, COMPLAINT_CATEGORIES } from '../../shared/constants';

const complaintValidators = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    body('category')
      .isIn(Object.values(COMPLAINT_CATEGORIES))
      .withMessage('Invalid complaint category'),
    body('priority')
      .optional()
      .isIn(Object.values(COMPLAINT_PRIORITY))
      .withMessage('Invalid priority level'),
    body('ward')
      .isInt({ min: 1 })
      .withMessage('Ward number is required'),
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be [longitude, latitude]'),
    body('location.address')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  updateStatus: [
    param('id').isMongoId().withMessage('Invalid complaint ID'),
    body('status')
      .isIn(Object.values(COMPLAINT_STATUS))
      .withMessage('Invalid status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }),
  ],

  getById: [
    param('id').isMongoId().withMessage('Invalid complaint ID'),
  ],

  getByTrackingId: [
    param('trackingId')
      .matches(/^GRV-[A-Z0-9]+-[A-F0-9]+$/)
      .withMessage('Invalid tracking ID format'),
  ],

  nearby: [
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    query('maxDistance').optional().isInt({ min: 100, max: 5000 }),
  ],
};

export default complaintValidators;
