/**
 * Auth Controller
 * Handles HTTP request/response for authentication endpoints.
 * No business logic here — delegates to AuthService.
 */
import { Request, Response } from 'express';
import authService, { ICompleteRegistrationDTO } from './auth.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

interface ISendOTPBody {
  phone: string;
}

interface ILoginWithPinBody {
  phone: string;
  pin: string;
}

interface IVerifyForgotPinOTPBody {
  phone: string;
  otp: string;
}

interface IResetPinBody {
  resetToken: string;
  newPin: string;
}

interface IRefreshTokenBody {
  refreshToken: string;
}

/**
 * POST /auth/register/send-otp
 */
const sendRegistrationOTP = asyncHandler(async (req: Request<unknown, unknown, ISendOTPBody>, res: Response) => {
  const { phone } = req.body;
  const result = await authService.sendRegistrationOTP(phone);
  return ApiResponse.success(res, { data: result, message: 'OTP sent successfully' });
});

interface IVerifyPhoneBody {
  phone: string;
  otp: string;
}

/**
 * POST /auth/register/verify-phone
 */
const verifyRegistrationPhone = asyncHandler(async (req: Request<unknown, unknown, IVerifyPhoneBody>, res: Response) => {
  const { phone, otp } = req.body;
  const result = await authService.verifyRegistrationPhone(phone, otp);
  return ApiResponse.success(res, { data: result, message: 'Phone verified successfully' });
});

/**
 * POST /auth/register/complete
 */
const completeRegistration = asyncHandler(async (req: Request<unknown, unknown, ICompleteRegistrationDTO>, res: Response) => {
  const { registrationToken, pin, ward, role } = req.body;
  const result = await authService.completeRegistration({ registrationToken, pin, ward, role });
  return ApiResponse.created(res, { data: result, message: 'Registration successful' });
});

/**
 * POST /auth/login/pin
 */
const loginWithPin = asyncHandler(async (req: Request<unknown, unknown, ILoginWithPinBody>, res: Response) => {
  const { phone, pin } = req.body;
  const result = await authService.loginWithPin(phone, pin);
  return ApiResponse.success(res, { data: result, message: 'Login successful' });
});

/**
 * POST /auth/forgot-pin/send-otp
 */
const sendForgotPinOTP = asyncHandler(async (req: Request<unknown, unknown, ISendOTPBody>, res: Response) => {
  const { phone } = req.body;
  const result = await authService.sendForgotPinOTP(phone);
  return ApiResponse.success(res, { data: result, message: 'OTP sent successfully' });
});

/**
 * POST /auth/forgot-pin/verify-otp
 */
const verifyForgotPinOTP = asyncHandler(async (req: Request<unknown, unknown, IVerifyForgotPinOTPBody>, res: Response) => {
  const { phone, otp } = req.body;
  const result = await authService.verifyForgotPinOTP(phone, otp);
  return ApiResponse.success(res, { data: result, message: 'Phone verified successfully' });
});

/**
 * POST /auth/forgot-pin/reset-pin
 */
const resetPin = asyncHandler(async (req: Request<unknown, unknown, IResetPinBody>, res: Response) => {
  const { resetToken, newPin } = req.body;
  const result = await authService.resetPin(resetToken, newPin);
  return ApiResponse.success(res, { data: result, message: 'PIN reset successfully' });
});

/**
 * POST /auth/refresh-token
 */
const refreshToken = asyncHandler(async (req: Request<unknown, unknown, IRefreshTokenBody>, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);
  return ApiResponse.success(res, { data: tokens, message: 'Token refreshed' });
});

/**
 * POST /auth/logout
 */
const logout = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.logout(req.user!.id);
  return ApiResponse.success(res, { data: result });
});

const authController = {
  sendRegistrationOTP,
  verifyRegistrationPhone,
  completeRegistration,
  loginWithPin,
  sendForgotPinOTP,
  verifyForgotPinOTP,
  resetPin,
  refreshToken,
  logout,
};

export default authController;
