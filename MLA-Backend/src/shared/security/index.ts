/**
 * Security Middleware Configuration
 * Production-ready security headers and protections.
 */
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { RedisStore } from 'rate-limit-redis';
import config from '../../config';
import { redisManager } from '../cache';

const isTest = process.env.NODE_ENV === 'test';

// Factory for rate limit store
const getRateLimitStore = (prefix: string) => {
  if (!config.redis.enabled) return undefined; // Fallback to memory store
  
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      const client = redisManager.getClient();
      if (client) {
        // @ts-ignore
        return client.call(...args) as any;
      }
      // If Redis is temporarily down, rate-limit-redis expects an error to be thrown
      // or we can mock a successful pass if we want graceful degradation
      throw new Error('Redis client not available');
    },
    prefix: `rl:${prefix}:`,
  });
};

/**
 * Helmet - sets various HTTP headers for security
 */
export const helmetMiddleware = helmet();

/**
 * CORS - Cross-Origin Resource Sharing
 */
export const corsMiddleware = cors({
  origin: config.cors.origin === '*' ? true : config.cors.origin.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
});

/**
 * Rate Limiter - General API rate limiting
 * Skipped in test environment to prevent test interference
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  store: getRateLimitStore('api'),
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    errorCode: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth Rate Limiter - Stricter limit for auth endpoints
 * Skipped in test environment to prevent test interference
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  store: getRateLimitStore('auth'),
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OTP Rate Limiter - Very strict for OTP requests
 * Skipped in test environment to prevent test interference
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 OTP requests per 10 minutes
  store: getRateLimitStore('otp'),
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later',
    errorCode: 'OTP_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * MongoDB Injection Prevention
 */
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
});

/**
 * HTTP Parameter Pollution Protection
 */
export const hppMiddleware = hpp();
