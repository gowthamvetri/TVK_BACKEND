/**
 * Analytics Controller
 */
import { Request, Response } from 'express';
import analyticsService from './analytics.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

const getConstituencyKPIs = asyncHandler(async (req: Request, res: Response) => {
  const kpis = await analyticsService.getConstituencyKPIs();
  return ApiResponse.success(res, { data: kpis });
});

const getWardAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await analyticsService.getWardAnalytics(parseInt(req.params.ward, 10));
  return ApiResponse.success(res, { data: analytics });
});

const getOfficerAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await analyticsService.getOfficerAnalytics(req.params.officerId);
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
