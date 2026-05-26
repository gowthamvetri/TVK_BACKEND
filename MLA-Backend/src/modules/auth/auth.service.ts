/**
 * Auth Service
 * Business logic for authentication, OTP, JWT, and PIN operations.
 */
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../../config';
import authRepository from './auth.repository';
import userRepository from '../users/user.repository';
import OTP from './OTP.model';
import { generateOTP } from '../../shared/utils/helpers';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../shared/utils/errors';
import { ROLES } from '../../shared/constants';
import officialsService from '../officials/officials.service';
import eventBus from '../../shared/events/eventBus';
import EVENTS from '../../shared/events/eventNames';
import logger from '../../shared/logger';
import smsService from '../../shared/services/sms.service';

interface IUserTokenPayload {
  _id: mongoose.Types.ObjectId | string;
  role?: string;
  phone?: string;
  ward?: number;
}

/**
 * Generate access token
 */
const generateAccessToken = (user: IUserTokenPayload): string => {
  return jwt.sign(
    { id: user._id, role: user.role, phone: user.phone, ward: user.ward },
    config.jwt.accessSecret as string,
    { expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'] }
  );
};

/**
 * Generate registration token
 */
const generateRegistrationToken = (phone: string): string => {
  return jwt.sign(
    { phone },
    config.jwt.registrationSecret as string,
    { expiresIn: config.jwt.registrationExpiry as jwt.SignOptions['expiresIn'] }
  );
};

/**
 * Generate reset token
 */
const generateResetToken = (phone: string): string => {
  return jwt.sign(
    { phone },
    config.jwt.resetSecret as string,
    { expiresIn: config.jwt.resetExpiry as jwt.SignOptions['expiresIn'] }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user: IUserTokenPayload): string => {
  return jwt.sign(
    { id: user._id },
    config.jwt.refreshSecret as string,
    { expiresIn: config.jwt.refreshExpiry as jwt.SignOptions['expiresIn'] }
  );
};

/**
 * Generate token pair
 */
const generateTokens = (user: IUserTokenPayload) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

/**
 * Step 1: Send OTP for registration
 */
const sendRegistrationOTP = async (phone: string) => {
  // Check if user already exists
  const existingUser = await userRepository.findByPhone(phone);
  if (existingUser) {
    throw new BadRequestError('Phone number already registered', 'PHONE_EXISTS');
  }

  const otp = generateOTP(6);
  await authRepository.createOTP(phone, otp, 'registration');

  // Send OTP via SMS
  await smsService.sendOTP(phone, otp, 'registration');

  logger.info(`[AuthService] Registration OTP generated for ${phone}: ${config.app.isDevelopment ? otp : '***'}`);

  return {
    message: 'OTP sent successfully',
    // Only return OTP in development for testing
    ...(config.app.isDevelopment && { otp }),
  };
};

/**
 * Step 2: Verify OTP and return registration token
 * SECURITY: Increment attempt count and lock out after max attempts
 */
const verifyRegistrationPhone = async (phone: string, otp: string) => {
  const otpRecord = await authRepository.findValidOTP(phone, otp, 'registration');

  if (!otpRecord) {
    // OTP not found or max attempts exceeded
    // Try to find any OTP record to increment attempt
    const anyOTPRecord = await OTP.findOne({
      phone,
      purpose: 'registration',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (anyOTPRecord) {
      // Increment attempt to lock out after max attempts
      await authRepository.incrementOTPAttempt(anyOTPRecord._id);
    }

    throw new BadRequestError('Invalid or expired OTP', 'INVALID_OTP');
  }

  // Mark OTP as used
  await authRepository.markOTPUsed(otpRecord._id);

  const registrationToken = generateRegistrationToken(phone);

  return {
    message: 'Phone verified successfully',
    registrationToken,
  };
};

export interface ICompleteRegistrationDTO {
  registrationToken: string;
  pin: string;
  ward?: number;
}

/**
 * Step 3: Complete registration using token
 * SECURITY: Citizens always register as citizen; elevated roles come only from official registry.
 */
const completeRegistration = async ({ registrationToken, pin, ward }: ICompleteRegistrationDTO) => {
  let phone: string;
  try {
    const decoded = jwt.verify(registrationToken, config.jwt.registrationSecret as string) as { phone: string };
    phone = decoded.phone;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired registration token');
  }

  // Check if user already exists just in case
  const existingUser = await userRepository.findByPhone(phone);
  if (existingUser) {
    throw new BadRequestError('User already registered');
  }

  // Get pre-registered role from official registry (if any)
  // Otherwise, citizen is the default role
  const preRegisteredRole = await officialsService.getRoleForPhone(phone);
  const userRole = preRegisteredRole || ROLES.CITIZEN;

  const user = await userRepository.create({
    phone,
    pin,
    ward,
    role: userRole,
    isVerified: true,
  });

  // Generate tokens
  const tokens = generateTokens(user);
  await authRepository.updateRefreshToken(user._id, tokens.refreshToken);

  // Emit event
  eventBus.emit(EVENTS.USER_REGISTERED, { userId: user._id, role: user.role });

  return {
    user,
    ...tokens,
  };
};

/**
 * Login with phone + PIN
 */
const loginWithPin = async (phone: string, pin: string) => {
  const user = await authRepository.findUserByPhoneWithPin(phone);

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is deactivated');
  }

  const isMatch = await user.comparePin(pin);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate tokens
  const tokens = generateTokens(user);
  await authRepository.updateRefreshToken(user._id, tokens.refreshToken);

  // Emit login event
  eventBus.emit(EVENTS.USER_LOGIN, { userId: user._id });

  // Remove sensitive data
  user.pin = undefined;
  user.refreshToken = undefined;

  return {
    user,
    ...tokens,
  };
};

/**
 * Send Forgot PIN OTP
 */
const sendForgotPinOTP = async (phone: string) => {
  const user = await userRepository.findByPhone(phone);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const otp = generateOTP(6);
  await authRepository.createOTP(phone, otp, 'reset_pin');

  // Send OTP via SMS
  await smsService.sendOTP(phone, otp, 'reset');

  logger.info(`[AuthService] Reset PIN OTP generated for ${phone}: ${config.app.isDevelopment ? otp : '***'}`);

  return {
    message: 'OTP sent successfully',
    ...(config.app.isDevelopment && { otp }),
  };
};

/**
 * Verify Forgot PIN OTP and return reset token
 * SECURITY: Increment attempt count and lock out after max attempts
 */
const verifyForgotPinOTP = async (phone: string, otp: string) => {
  const otpRecord = await authRepository.findValidOTP(phone, otp, 'reset_pin');

  if (!otpRecord) {
    // Try to find any OTP record to increment attempt
    const anyOTPRecord = await OTP.findOne({
      phone,
      purpose: 'reset_pin',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (anyOTPRecord) {
      // Increment attempt to lock out after max attempts
      await authRepository.incrementOTPAttempt(anyOTPRecord._id);
    }

    throw new BadRequestError('Invalid or expired OTP', 'INVALID_OTP');
  }

  await authRepository.markOTPUsed(otpRecord._id);

  const resetToken = generateResetToken(phone);

  return {
    message: 'Phone verified successfully',
    resetToken,
  };
};

/**
 * Reset PIN securely using token
 */
const resetPin = async (resetToken: string, newPin: string) => {
  let phone: string;
  try {
    const decoded = jwt.verify(resetToken, config.jwt.resetSecret as string) as { phone: string };
    phone = decoded.phone;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  const user = await userRepository.findByPhone(phone);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Update PIN and invalidate refresh tokens to force re-login
  user.pin = newPin;
  user.refreshToken = undefined;
  await user.save();

  return {
    message: 'PIN reset successfully. Please login with your new PIN.',
  };
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret as string) as { id: string };
    const user = await authRepository.findUserByIdWithRefreshToken(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokens = generateTokens(user);
    await authRepository.updateRefreshToken(user._id, tokens.refreshToken);

    return tokens;
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

/**
 * Logout
 */
const logout = async (userId: string) => {
  await authRepository.clearRefreshToken(userId);
  return { message: 'Logged out successfully' };
};

const authService = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  sendRegistrationOTP,
  verifyRegistrationPhone,
  completeRegistration,
  loginWithPin,
  sendForgotPinOTP,
  verifyForgotPinOTP,
  resetPin,
  refreshAccessToken,
  logout,
};

export default authService;
