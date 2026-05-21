/**
 * Auth Repository
 * Data access layer for authentication operations.
 */
import mongoose, { HydratedDocument } from 'mongoose';
import OTP, { IOTP } from './OTP.model';
import User, { IUser } from '../users/User.model';

type UserDoc = HydratedDocument<IUser>;

/**
 * Create a new OTP record
 */
const createOTP = async (phone: string, otp: string, purpose: string = 'registration'): Promise<IOTP> => {
  // Invalidate any existing OTPs for this phone + purpose
  await OTP.deleteMany({ phone, purpose });
  return OTP.create({ phone, otp, purpose });
};

/**
 * Find valid OTP
 */
const findValidOTP = async (phone: string, otp: string, purpose: string): Promise<IOTP | null> => {
  return OTP.findOne({
    phone,
    otp,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 },
  });
};

/**
 * Mark OTP as used
 */
const markOTPUsed = async (otpId: mongoose.Types.ObjectId | string): Promise<IOTP | null> => {
  return OTP.findByIdAndUpdate(otpId, { isUsed: true });
};

/**
 * Increment OTP attempt count
 */
const incrementOTPAttempt = async (otpId: mongoose.Types.ObjectId | string): Promise<IOTP | null> => {
  return OTP.findByIdAndUpdate(otpId, { $inc: { attempts: 1 } });
};

/**
 * Find user by phone with PIN selected
 */
const findUserByPhoneWithPin = async (phone: string): Promise<UserDoc | null> => {
  return User.findOne({ phone }).select('+pin +refreshToken').exec() as Promise<UserDoc | null>;
};

/**
 * Find user by ID with refresh token
 */
const findUserByIdWithRefreshToken = async (userId: mongoose.Types.ObjectId | string): Promise<UserDoc | null> => {
  return User.findById(userId).select('+refreshToken').exec() as Promise<UserDoc | null>;
};

/**
 * Update user's refresh token
 */
const updateRefreshToken = async (userId: mongoose.Types.ObjectId | string, refreshToken: string | null): Promise<UserDoc | null> => {
  return User.findByIdAndUpdate(userId, { refreshToken, lastLogin: new Date() }).exec() as Promise<UserDoc | null>;
};

/**
 * Clear refresh token (logout)
 */
const clearRefreshToken = async (userId: mongoose.Types.ObjectId | string): Promise<UserDoc | null> => {
  return User.findByIdAndUpdate(userId, { refreshToken: null }).exec() as Promise<UserDoc | null>;
};

const authRepository = {
  createOTP,
  findValidOTP,
  markOTPUsed,
  incrementOTPAttempt,
  findUserByPhoneWithPin,
  findUserByIdWithRefreshToken,
  updateRefreshToken,
  clearRefreshToken,
};

export default authRepository;
