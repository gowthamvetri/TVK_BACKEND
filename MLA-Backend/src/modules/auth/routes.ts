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
 * /auth/register/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and complete registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp, name, pin]
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *               name:
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
  '/register/verify-otp',
  authLimiter,
  authValidators.verifyOTPAndRegister,
  validate,
  authController.verifyOTPAndRegister
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
 * /auth/login/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP for login
 */
router.post(
  '/login/send-otp',
  otpLimiter,
  authValidators.sendOTP,
  validate,
  authController.sendLoginOTP
);

/**
 * @swagger
 * /auth/login/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP for login
 */
router.post(
  '/login/verify-otp',
  authLimiter,
  authValidators.verifyLoginOTP,
  validate,
  authController.verifyLoginOTP
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
