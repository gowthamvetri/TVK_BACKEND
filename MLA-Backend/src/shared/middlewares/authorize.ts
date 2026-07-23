/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if the authenticated user has the required role(s).
 * Designed for easy extension to permission-based access in the future.
 */
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * Authorize specific roles
 * @param allowedRoles - Roles permitted to access the route
 * @returns Express middleware
 *
 * @example
 * router.get('/admin', authenticate, authorize('mla', 'ward_councillor'), controller);
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`Role '${req.user.role}' is not authorized to access this resource`);
    }

    next();
  };
};

/**
 * Authorize permission or specific roles
 * @param requiredPermission - Permission string required for deputy role
 * @param allowedRoles - Other roles permitted to access the route
 */
export const authorizePermission = (requiredPermission: string, ...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    // MLA super-admin has access to everything
    if (req.user.role === 'mla') {
      return next();
    }

    // Role check
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Deputy permission check
    if (req.user.role === 'deputy' && Array.isArray(req.user.permissions) && req.user.permissions.includes(requiredPermission)) {
      return next();
    }

    throw new ForbiddenError(`You do not have the required permission '${requiredPermission}' or role to perform this action`);
  };
};

/**
 * Authorize based on resource ownership or elevated role
 * Allows access if user owns the resource OR has an elevated role
 * @param getResourceOwnerId - Function that extracts owner ID from request
 * @param elevatedRoles - Roles that can bypass ownership check
 */
export const authorizeOwnerOrRole = (
  getResourceOwnerId: (req: Request) => Promise<string | undefined> | string | undefined,
  ...elevatedRoles: string[]
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.user && elevatedRoles.includes(req.user.role)) {
        return next();
      }

      const ownerId = await getResourceOwnerId(req);
      if (ownerId && ownerId.toString() === req.user?.id) {
        return next();
      }

      throw new ForbiddenError('You do not have permission to access this resource');
    } catch (error) {
      next(error);
    }
  };
};
