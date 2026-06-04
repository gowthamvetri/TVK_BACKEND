/**
 * Feedback Validators
 */
import { body, query } from 'express-validator';

const feedbackValidators = {
  create: [
    body('message')
      .trim()
      .isLength({ min: 5, max: 2000 })
      .withMessage('Message must be between 5 and 2000 characters'),
  ],
  list: [
    query('citizen').optional().isMongoId().withMessage('Citizen must be a valid id'),
    query('ward')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Ward must be a valid number between 1 and 200')
      .toInt(),
  ],
};

export default feedbackValidators;
