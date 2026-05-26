/**
 * User Controller
 */
import { Request, Response } from 'express';
import userService, { IProfileUpdate, IUserFilterQuery } from './user.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';
import { ForbiddenError, NotFoundError } from '../../shared/utils/errors';
import { ROLES } from '../../shared/constants';

const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.id);
  return ApiResponse.success(res, { data: user });
});

const updateProfile = asyncHandler(async (req: Request<unknown, unknown, IProfileUpdate>, res: Response) => {
  const user = await userService.updateProfile(req.user!.id, req.body);
  return ApiResponse.success(res, { data: user, message: 'Profile updated' });
});

const listUsers = asyncHandler(async (req: Request<unknown, unknown, unknown, IUserFilterQuery>, res: Response) => {
  // SECURITY: Pass user context to enforce ward scoping for ward councillors
  const { data, total, page, limit } = await userService.listUsers(req.query, req.user!);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const getUserById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = req.user!;
  const targetUserId = req.params.id;
  
  // SECURITY: Fetch the target user first
  const targetUser = await userService.getProfile(targetUserId);
  
  // SECURITY: Ward councillors can only view users in their ward
  if (user.role === ROLES.WARD_COUNCILLOR && targetUser.ward !== user.ward) {
    throw new ForbiddenError('Ward councillors can only view users in their assigned ward');
  }
  
  return ApiResponse.success(res, { data: targetUser });
});

const deactivateUser = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = await userService.deactivateUser(req.params.id);
  return ApiResponse.success(res, { data: user, message: 'User deactivated' });
});

const activateUser = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = await userService.activateUser(req.params.id);
  return ApiResponse.success(res, { data: user, message: 'User activated' });
});

const getWardOfficers = asyncHandler(async (req: Request<{ ward: string }>, res: Response) => {
  const user = req.user!;
  const requestedWard = parseInt(req.params.ward, 10);
  
  // SECURITY: Ward councillors can only view officers in their own ward
  if (user.role === ROLES.WARD_COUNCILLOR && requestedWard !== user.ward) {
    throw new ForbiddenError('Ward councillors can only view officers in their assigned ward');
  }
  
  const officers = await userService.getOfficersForWard(requestedWard);
  return ApiResponse.success(res, { data: officers });
});

const userController = {
  getProfile,
  updateProfile,
  listUsers,
  getUserById,
  deactivateUser,
  activateUser,
  getWardOfficers,
};

export default userController;
