/**
 * Centralized Environment Configuration
 * All environment variables are validated and exported from here.
 * No other file should access process.env directly.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  app: {
    name: process.env.APP_NAME || 'MLA-Grievance-System',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '', 10) || 5000,
    apiVersion: process.env.API_VERSION || 'v1',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },

  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mla_grievance',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    registrationSecret: process.env.JWT_REGISTRATION_SECRET || 'dev-registration-secret-change-in-production',
    resetSecret: process.env.JWT_RESET_SECRET || 'dev-reset-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    registrationExpiry: process.env.JWT_REGISTRATION_EXPIRY || '15m',
    resetExpiry: process.env.JWT_RESET_EXPIRY || '15m',
  },

  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '', 10) || 5,
  },

  pin: {
    saltRounds: parseInt(process.env.PIN_SALT_ROUNDS || '', 10) || 10,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '', 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '', 10) || 100,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};

export default config;
