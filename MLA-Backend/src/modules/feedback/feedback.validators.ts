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
  ],
};

export default feedbackValidators;
