/**
 * Dashboard Controller
 */
import { Request, Response } from 'express';
import dashboardService from './dashboard.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';
import { ROLES } from '../../shared/constants';
import { BadRequestError } from '../../shared/utils/errors';

const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  let data;
  const user = req.user!;

  switch (user.role) {
    case ROLES.CITIZEN:
      data = await dashboardService.getCitizenDashboard(user.id);
      break;
    case ROLES.SERVICE_OFFICER:
      data = await dashboardService.getOfficerDashboard(user.id);
      break;
    case ROLES.WARD_COUNCILLOR:
      if (user.ward === undefined) {
        throw new BadRequestError('Ward is required for ward councillor dashboard');
      }
      data = await dashboardService.getCouncillorDashboard(user.ward);
      break;
    case ROLES.MLA:
      data = await dashboardService.getMLADashboard();
      break;
    default:
      data = {};
  }

  return ApiResponse.success(res, { data });
});

export default {
  getDashboard
};
