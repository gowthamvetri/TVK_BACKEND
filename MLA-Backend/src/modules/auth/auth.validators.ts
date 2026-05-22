/**
 * Auth Validators
 * Express-validator chains for auth endpoints.
 */
import { body } from 'express-validator';

const normalizePhone = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
};

const authValidators = {
  sendOTP: [
    body('phone')
      .trim()
      .customSanitizer(normalizePhone)
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Valid Indian mobile number is required'),
  ],

  verifyRegistrationPhone: [
    body('phone')
      .trim()
      .customSanitizer(normalizePhone)
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Valid Indian mobile number is required'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be a 6-digit number'),
  ],

  completeRegistration: [
    body('registrationToken')
      .notEmpty()
      .withMessage('Registration token is required'),
    body('pin')
      .trim()
      .matches(/^\d{4,6}$/)
      .withMessage('PIN must be a 4-6 digit number'),
    body('ward')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Ward must be a positive integer'),
    body('role')
      .optional()
      .isIn(['citizen', 'service_officer', 'ward_councillor', 'mla'])
      .withMessage('Invalid role'),
  ],

  loginWithPin: [
    body('phone')
      .trim()
      .customSanitizer(normalizePhone)
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Valid Indian mobile number is required'),
    body('pin')
      .trim()
      .matches(/^\d{4,6}$/)
      .withMessage('PIN must be a 4-6 digit number'),
  ],

  verifyForgotPinOTP: [
    body('phone')
      .trim()
      .customSanitizer(normalizePhone)
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Valid Indian mobile number is required'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be a 6-digit number'),
  ],

  resetPin: [
    body('resetToken')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPin')
      .trim()
      .matches(/^\d{4,6}$/)
      .withMessage('PIN must be a 4-6 digit number'),
  ],

  refreshToken: [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
};

export default authValidators;
