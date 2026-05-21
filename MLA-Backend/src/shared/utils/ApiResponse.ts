/**
 * Standardized API Response Helpers
 * Ensures consistent JSON response structure across all endpoints.
 */
import { Response } from 'express';

const success = (
  res: Response,
  {
    data = null,
    message = 'Success',
    statusCode = 200,
    meta = null,
  }: { data?: unknown; message?: string; statusCode?: number; meta?: unknown }
) => {
  const response: Record<string, unknown> = {
    success: true,
    message,
    data,
  };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

const created = (
  res: Response,
  { data = null, message = 'Resource created successfully' }: { data?: unknown; message?: string }
) => {
  return success(res, { data, message, statusCode: 201 });
};

const paginated = (
  res: Response,
  {
    data,
    page,
    limit,
    total,
    message = 'Success',
  }: { data: unknown; page: number; limit: number; total: number; message?: string }
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page: parseInt(String(page), 10),
      limit: parseInt(String(limit), 10),
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};

const error = (
  res: Response,
  {
    message = 'Internal Server Error',
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    errors = null,
  }: { message?: string; statusCode?: number; errorCode?: string; errors?: unknown }
) => {
  const response: Record<string, unknown> = {
    success: false,
    message,
    errorCode,
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const noContent = (res: Response) => res.status(204).send();

const ApiResponse = {
  success,
  created,
  paginated,
  error,
  noContent,
};

export default ApiResponse;
