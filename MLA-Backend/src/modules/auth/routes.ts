/**
 * Auth Routes
 * 
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & OTP management
 */ 
import { Router } from 'express';
import authController from './auth.controller';
import authValidators from './auth.validators';
import validate from '../../shared/middlewares/validate';
import authenticate from '../../shared/middlewares/authenticate';
import { authLimiter, otpLimiter } from '../../shared/security';

const router = Router();

/**
 * @swagger
 * /auth/register/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP for registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post(
  '/register/send-otp',
  otpLimiter,
  authValidators.sendOTP,
  validate,
  authController.sendRegistrationOTP
);

/**
 * @swagger
 * /auth/register/verify-phone:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and get registration token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     registrationToken:
 *                       type: string
 *                     message:
 *                       type: string
 */
router.post(
  '/register/verify-phone',
  authLimiter,
  authValidators.verifyRegistrationPhone,
  validate,
  authController.verifyRegistrationPhone
);

/**
 * @swagger
 * /auth/register/complete:
 *   post:
 *     tags: [Auth]
 *     summary: Complete registration using registration token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [registrationToken, pin]
 *             properties:
 *               registrationToken:
 *                 type: string
 *               pin:
 *                 type: string
 *               ward:
 *                 type: integer
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful
 */
router.post(
  '/register/complete',
  authLimiter,
  authValidators.completeRegistration,
  validate,
  authController.completeRegistration
);

/**
 * @swagger
 * /auth/login/pin:
 *   post:
 *     tags: [Auth]
 *     summary: Login with phone and PIN
 */
router.post(
  '/login/pin',
  authLimiter,
  authValidators.loginWithPin,
  validate,
  authController.loginWithPin
);

/**
 * @swagger
 * /auth/forgot-pin/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP for PIN reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post(
  '/forgot-pin/send-otp',
  otpLimiter,
  authValidators.sendOTP,
  validate,
  authController.sendForgotPinOTP
);

/**
 * @swagger
 * /auth/forgot-pin/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and get reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully
 */
router.post(
  '/forgot-pin/verify-otp',
  authLimiter,
  authValidators.verifyForgotPinOTP,
  validate,
  authController.verifyForgotPinOTP
);

/**
 * @swagger
 * /auth/forgot-pin/reset-pin:
 *   post:
 *     tags: [Auth]
 *     summary: Reset PIN using reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPin]
 *             properties:
 *               resetToken:
 *                 type: string
 *               newPin:
 *                 type: string
 *     responses:
 *       200:
 *         description: PIN reset successfully
 */
router.post(
  '/forgot-pin/reset-pin',
  authLimiter,
  authValidators.resetPin,
  validate,
  authController.resetPin
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
router.post(
  '/refresh-token',
  authValidators.refreshToken,
  validate,
  authController.refreshToken
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate refresh token
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', authenticate, authController.logout);

export default router;
