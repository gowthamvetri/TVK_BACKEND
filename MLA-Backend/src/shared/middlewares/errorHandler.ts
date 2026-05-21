/**
 * Global Error Handler Middleware
 * Catches all errors and returns standardized error responses.
 */
import { Request, Response, NextFunction } from 'express';
import logger from '../logger';
import { AppError } from '../utils/errors';
import ApiResponse from '../utils/ApiResponse';
import config from '../../config';

type ErrorWithCode = {
  name?: string;
  message?: string;
  stack?: string;
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { path?: string; message?: string }>;
  path?: string;
  value?: unknown;
};

const isMongooseValidationError = (err: ErrorWithCode): err is ErrorWithCode & { name: 'ValidationError'; errors: Record<string, { path?: string; message?: string }> } => {
  return err.name === 'ValidationError' && !!err.errors;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const error = err as ErrorWithCode;
  // Log the error
  logger.error(`${error.message}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: config.app.isDevelopment ? error.stack : undefined,
  });

  // Mongoose validation error
  if (isMongooseValidationError(error)) {
    const errors = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiResponse.error(res, {
      message: 'Validation failed',
      statusCode: 422,
      errorCode: 'VALIDATION_ERROR',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000 && error.keyValue) {
    const field = Object.keys(error.keyValue)[0];
    return ApiResponse.error(res, {
      message: `Duplicate value for field: ${field}`,
      statusCode: 409,
      errorCode: 'DUPLICATE_KEY',
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return ApiResponse.error(res, {
      message: `Invalid ${error.path}: ${error.value}`,
      statusCode: 400,
      errorCode: 'INVALID_ID',
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, {
      message: 'Invalid token',
      statusCode: 401,
      errorCode: 'INVALID_TOKEN',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return ApiResponse.error(res, {
      message: 'Token expired',
      statusCode: 401,
      errorCode: 'TOKEN_EXPIRED',
    });
  }

  // Custom Application Errors
  if (err instanceof AppError) {
    return ApiResponse.error(res, {
      message: err.message,
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      errors: err.errors || undefined,
    });
  }

  // Unknown / Unhandled errors
  return ApiResponse.error(res, {
    message: config.app.isProduction ? 'Something went wrong' : error.message,
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
  });
};

export default errorHandler;
