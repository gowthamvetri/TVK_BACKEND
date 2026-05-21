/**
 * Shared Validators
 * Common express-validator chains reused across modules.
 */
import { body, param, query } from 'express-validator';
import { ROLES, COMPLAINT_STATUS, COMPLAINT_PRIORITY, COMPLAINT_CATEGORIES } from '../constants';

const validators = {
  // Common ID parameter
  objectId: (field = 'id') =>
    param(field).isMongoId().withMessage(`Invalid ${field} format`),

  // Phone number
  phone: body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian mobile number is required'),

  // Pagination
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],

  // Role validation
  role: body('role')
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),

  // Complaint status
  complaintStatus: body('status')
    .isIn(Object.values(COMPLAINT_STATUS))
    .withMessage(`Status must be one of: ${Object.values(COMPLAINT_STATUS).join(', ')}`),

  // Complaint priority
  complaintPriority: body('priority')
    .isIn(Object.values(COMPLAINT_PRIORITY))
    .withMessage(`Priority must be one of: ${Object.values(COMPLAINT_PRIORITY).join(', ')}`),

  // Complaint category
  complaintCategory: body('category')
    .isIn(Object.values(COMPLAINT_CATEGORIES))
    .withMessage(`Category must be one of: ${Object.values(COMPLAINT_CATEGORIES).join(', ')}`),

  // Ward number
  ward: body('ward')
    .isInt({ min: 1 })
    .withMessage('Ward number must be a positive integer'),
};

export default validators;
