/**
 * Centralized Environment Configuration
 * All environment variables are validated and exported from here.
 * No other file should access process.env directly.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KNOWN_DEV_SECRETS = {
  JWT_ACCESS: 'dev-access-secret-change-in-production',
  JWT_REFRESH: 'dev-refresh-secret-change-in-production',
  JWT_REGISTRATION: 'dev-registration-secret-change-in-production',
  JWT_RESET: 'dev-reset-secret-change-in-production',
};

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
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '', 10) || 0,
    enabled: process.env.REDIS_ENABLED !== 'false',
    // Connection pooling & resilience
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '', 10) || 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '', 10) || 10000,
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '', 10) || 5000,
    // TTL strategies (in seconds)
    ttl: {
      short: parseInt(process.env.REDIS_TTL_SHORT || '', 10) || 300, // 5 minutes - volatile data
      medium: parseInt(process.env.REDIS_TTL_MEDIUM || '', 10) || 3600, // 1 hour - moderate data
      long: parseInt(process.env.REDIS_TTL_LONG || '', 10) || 86400, // 24 hours - static data
      user: parseInt(process.env.REDIS_TTL_USER || '', 10) || 1800, // 30 minutes - user data
      complaint: parseInt(process.env.REDIS_TTL_COMPLAINT || '', 10) || 600, // 10 minutes - complaint data
      list: parseInt(process.env.REDIS_TTL_LIST || '', 10) || 300, // 5 minutes - list data
    },
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

/**
 * SECURITY: Validate production configuration
 * Fail fast if required secrets are missing or still set to development values
 */
const validateProductionConfig = (): void => {
  if (!config.app.isProduction) {
    return; // Skip validation in development
  }

  const errors: string[] = [];

  // Check required secrets are not missing
  if (!process.env.JWT_ACCESS_SECRET) {
    errors.push('JWT_ACCESS_SECRET is required in production');
  } else if (process.env.JWT_ACCESS_SECRET === KNOWN_DEV_SECRETS.JWT_ACCESS) {
    errors.push('JWT_ACCESS_SECRET is still set to development value');
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    errors.push('JWT_REFRESH_SECRET is required in production');
  } else if (process.env.JWT_REFRESH_SECRET === KNOWN_DEV_SECRETS.JWT_REFRESH) {
    errors.push('JWT_REFRESH_SECRET is still set to development value');
  }

  if (!process.env.JWT_REGISTRATION_SECRET) {
    errors.push('JWT_REGISTRATION_SECRET is required in production');
  } else if (process.env.JWT_REGISTRATION_SECRET === KNOWN_DEV_SECRETS.JWT_REGISTRATION) {
    errors.push('JWT_REGISTRATION_SECRET is still set to development value');
  }

  if (!process.env.JWT_RESET_SECRET) {
    errors.push('JWT_RESET_SECRET is required in production');
  } else if (process.env.JWT_RESET_SECRET === KNOWN_DEV_SECRETS.JWT_RESET) {
    errors.push('JWT_RESET_SECRET is still set to development value');
  }

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost')) {
    errors.push('MONGODB_URI must be set to a production database (not localhost)');
  }

  if (errors.length > 0) {
    console.error('❌ Production Configuration Validation Failed:\n' + errors.map(e => `  - ${e}`).join('\n'));
    process.exit(1);
  }
};

// Run validation on startup
validateProductionConfig();

export default config;
