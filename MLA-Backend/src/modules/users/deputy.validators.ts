import { body, param } from 'express-validator';
import { DEPUTY_PERMISSIONS, ROLES } from '../../shared/constants';

const allowedPermissions = Object.values(DEPUTY_PERMISSIONS);
const allowedOfficialRoles = [ROLES.SERVICE_OFFICER, ROLES.WARD_COUNCILLOR, ROLES.DEPUTY];

export const createDeputyValidator = [
  body('phone')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Valid 10-digit phone number is required'),
  body('pin')
    .trim()
    .isLength({ min: 4, max: 6 })
    .withMessage('PIN must be 4 to 6 digits'),
  body('ward')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Ward must be a positive integer'),
  body('permissions')
    .isArray()
    .withMessage('Permissions must be an array of strings')
    .custom((permissions: string[]) => {
      const invalid = permissions.filter((p) => !allowedPermissions.includes(p as any));
      if (invalid.length > 0) {
        throw new Error(`Invalid permissions: ${invalid.join(', ')}`);
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
    .withMessage('PIN must be 4 to 6 digits'),
  body('role')
    .isIn(allowedOfficialRoles)
    .withMessage(`Role must be one of: ${allowedOfficialRoles.join(', ')}`),
  body('ward')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Ward must be a positive integer'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be 2 to 100 characters'),
  body('permissions')
    .optional()
    .isArray()
    .custom((permissions: string[]) => {
      const invalid = permissions.filter((p) => !allowedPermissions.includes(p as any));
      if (invalid.length > 0) {
        throw new Error(`Invalid permissions: ${invalid.join(', ')}`);
      }
      return true;
    }),
];

export const updateDeputyPermissionsValidator = [
  param('id').isMongoId().withMessage('Invalid deputy ID'),
  body('permissions')
    .isArray()
    .withMessage('Permissions must be an array of strings')
    .custom((permissions: string[]) => {
      const invalid = permissions.filter((p) => !allowedPermissions.includes(p as any));
      if (invalid.length > 0) {
        throw new Error(`Invalid permissions: ${invalid.join(', ')}`);
      }
      return true;
    }),
];

export const transferCouncillorValidator = [
  param('id').isMongoId().withMessage('Invalid councillor ID'),
  body('targetWard')
    .isInt({ min: 1 })
    .withMessage('targetWard must be a positive integer'),
];

export default {
  createDeputyValidator,
  createOfficialValidator,
  updateDeputyPermissionsValidator,
  transferCouncillorValidator,
};
