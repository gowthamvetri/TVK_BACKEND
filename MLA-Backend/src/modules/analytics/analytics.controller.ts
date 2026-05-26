/**
 * Analytics Controller
 */
import { Request, Response } from 'express';
import analyticsService from './analytics.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';
import { ROLES } from '../../shared/constants';
import { ForbiddenError, NotFoundError } from '../../shared/utils/errors';
import userService from '../users/user.service';

const getConstituencyKPIs = asyncHandler(async (req: Request, res: Response) => {
  const kpis = await analyticsService.getConstituencyKPIs();
  return ApiResponse.success(res, { data: kpis });
});

const getWardAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const requestedWard = parseInt(req.params.ward, 10);
  
  // SECURITY: Enforce ward-level access for ward councillors
  if (user.role === ROLES.WARD_COUNCILLOR && user.ward !== requestedWard) {
    throw new ForbiddenError('Ward councillors can only access analytics for their assigned ward');
  }
  
  const analytics = await analyticsService.getWardAnalytics(requestedWard);
  return ApiResponse.success(res, { data: analytics });
});

const getOfficerAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const officerId = req.params.officerId;
  
  // SECURITY: Ward councillors can only access analytics for officers in their ward
  if (user.role === ROLES.WARD_COUNCILLOR) {
    try {
      const officer = await userService.getProfile(officerId);
      if (!officer || officer.ward !== user.ward) {
        throw new ForbiddenError('Ward councillors can only access analytics for officers in their assigned ward');
      }
    } catch (error) {
      if (error instanceof ForbiddenError) throw error;
      throw new NotFoundError('Officer not found');
    }
  }
  
  const analytics = await analyticsService.getOfficerAnalytics(officerId);
  return ApiResponse.success(res, { data: analytics });
});

const getWardComparison = asyncHandler(async (req: Request, res: Response) => {
  const comparison = await analyticsService.getWardComparison();
  return ApiResponse.success(res, { data: comparison });
});

export default {
  getConstituencyKPIs,
  getWardAnalytics,
  getOfficerAnalytics,
  getWardComparison
};
