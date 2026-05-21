/**
 * Authentication Middleware
 * Validates JWT access tokens and attaches user to request.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { UnauthorizedError } from '../utils/errors';

const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as {
      id: string;
      role: string;
      phone?: string;
      ward?: number;
    };
    req.user = {
      id: decoded.id,
      role: decoded.role,
      phone: decoded.phone,
      ward: decoded.ward,
    };
    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
};

export default authenticate;
