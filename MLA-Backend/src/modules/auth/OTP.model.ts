/**
 * OTP Model
 * Stores temporary OTPs with automatic expiration via MongoDB TTL index.
 */
import mongoose, { Document } from 'mongoose';
import config from '../../config';

export interface IOTP extends Document {
  phone: string;
  otp: string;
  purpose: string;
  attempts: number;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new mongoose.Schema<IOTP>(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'login', 'reset_pin', 'verify'],
      default: 'registration',
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000),
      index: { expires: 0 }, // TTL index — MongoDB auto-deletes expired docs
    },
  },
  {
    timestamps: true,
  }
);

const OTP = mongoose.model<IOTP>('OTP', otpSchema);

export default OTP;
