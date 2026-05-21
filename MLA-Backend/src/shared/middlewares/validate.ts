/**
 * Request Validation Middleware
 * Uses express-validator to validate request body, query, and params.
 */
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { ValidationError } from '../utils/errors';

/**
 * Validates the request using express-validator rules
 * and throws a ValidationError if validation fails.
 *
 * @example
 * router.post('/users', [body('phone').isMobilePhone()], validate, controller);
 */
const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err: ExpressValidationError) => {
      const field = 'path' in err ? err.path : 'param' in err ? err.param : undefined;
      return {
        field,
        message: err.msg,
        value: 'value' in err ? err.value : undefined,
      };
    });
    throw new ValidationError('Validation failed', formattedErrors);
  }
  next();
};

export default validate;
