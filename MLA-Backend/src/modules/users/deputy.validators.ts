import { body, param } from 'express-validator';
import { DEPUTY_PERMISSIONS, ROLES } from '../../shared/constants';

const allowedPermissions = Object.values(DEPUTY_PERMISSIONS);

/**
 * Officials that can be created through
 * POST /users/officials
 *
 * NOTE:
 * Deputy is NOT allowed here.
 * Deputy must be created ONLY through
 * POST /users/deputies
 */
const allowedOfficialRoles = [
  ROLES.SERVICE_OFFICER,
  ROLES.WARD_COUNCILLOR,
];

export const createDeputyValidator = [
  body('phone')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Valid 10-digit phone number is required'),

  body('pin')
    .trim()
    .isLength({ min: 4, max: 6 })
    .withMessage('PIN must be between 4 and 6 digits'),

  body('ward')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Ward must be a positive integer'),

  body('permissions')
    .isArray({ min: 0 })
    .withMessage('Permissions must be an array')
    .custom((permissions: string[]) => {
      const invalidPermissions = permissions.filter(
        permission => !allowedPermissions.includes(permission as any)
      );

      if (invalidPermissions.length) {
        throw new Error(
          `Invalid permissions: ${invalidPermissions.join(', ')}`
        );
      }

      return true;
    }),
];

export const createOfficialValidator = [
  body('phone')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Valid 10-digit phone number is required'),

  body('pin')
    .trim()
    .isLength({ min: 4, max: 6 })
    .withMessage('PIN must be between 4 and 6 digits'),

  body('role')
    .isIn(allowedOfficialRoles)
    .withMessage(
      `Role must be one of: ${allowedOfficialRoles.join(', ')}`
    ),

  body('ward')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Ward must be a positive integer'),

  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
];

export const updateDeputyPermissionsValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Deputy ID'),

  body('permissions')
    .isArray()
    .withMessage('Permissions must be an array')
    .custom((permissions: string[]) => {

      const invalidPermissions = permissions.filter(
        permission => !allowedPermissions.includes(permission as any)
      );

      if (invalidPermissions.length) {
        throw new Error(
          `Invalid permissions: ${invalidPermissions.join(', ')}`
        );
      }

      return true;
    }),
];

export const transferCouncillorValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid councillor ID'),

  body('targetWard')
    .isInt({ min: 1 })
    .withMessage('Target Ward must be a positive integer'),
];

export default {
  createDeputyValidator,
  createOfficialValidator,
  updateDeputyPermissionsValidator,
  transferCouncillorValidator,
};