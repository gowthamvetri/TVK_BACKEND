/**
 * Auth Controller
 * Handles HTTP request/response for authentication endpoints.
 * No business logic here — delegates to AuthService.
 */
import { Request, Response } from 'express';
import authService, { IRegisterDTO } from './auth.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

interface ISendOTPBody {
  phone: string;
}

interface ILoginWithPinBody {
  phone: string;
  pin: string;
}

interface IVerifyLoginOTPBody {
  phone: string;
  otp: string;
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

/**
 * POST /auth/register/verify-otp
 */
const verifyOTPAndRegister = asyncHandler(async (req: Request<unknown, unknown, IRegisterDTO>, res: Response) => {
  const { phone, otp, pin, ward, role } = req.body;
  const result = await authService.verifyOTPAndRegister({ phone, otp, pin, ward, role });
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
 * POST /auth/login/send-otp
 */
const sendLoginOTP = asyncHandler(async (req: Request<unknown, unknown, ISendOTPBody>, res: Response) => {
  const { phone } = req.body;
  const result = await authService.sendLoginOTP(phone);
  return ApiResponse.success(res, { data: result, message: 'OTP sent successfully' });
});

/**
 * POST /auth/login/verify-otp
 */
const verifyLoginOTP = asyncHandler(async (req: Request<unknown, unknown, IVerifyLoginOTPBody>, res: Response) => {
  const { phone, otp } = req.body;
  const result = await authService.verifyLoginOTP(phone, otp);
  return ApiResponse.success(res, { data: result, message: 'Login successful' });
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
  verifyOTPAndRegister,
  loginWithPin,
  sendLoginOTP,
  verifyLoginOTP,
  refreshToken,
  logout,
};

export default authController;
