/**
 * User Controller
 */
import { Request, Response } from 'express';
import userService, { IProfileUpdate, IUserFilterQuery } from './user.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

interface IUpdateFCMTokenBody {
  fcmToken: string;
}

const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.id);
  return ApiResponse.success(res, { data: user });
});

const updateProfile = asyncHandler(async (req: Request<unknown, unknown, IProfileUpdate>, res: Response) => {
  const user = await userService.updateProfile(req.user!.id, req.body);
  return ApiResponse.success(res, { data: user, message: 'Profile updated' });
});

const updateFCMToken = asyncHandler(async (req: Request<unknown, unknown, IUpdateFCMTokenBody>, res: Response) => {
  await userService.updateFCMToken(req.user!.id, req.body.fcmToken);
  return ApiResponse.success(res, { message: 'FCM token updated' });
});

const listUsers = asyncHandler(async (req: Request<unknown, unknown, unknown, IUserFilterQuery>, res: Response) => {
  const { data, total, page, limit } = await userService.listUsers(req.query);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const getUserById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = await userService.getProfile(req.params.id);
  return ApiResponse.success(res, { data: user });
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
  const officers = await userService.getOfficersForWard(parseInt(req.params.ward, 10));
  return ApiResponse.success(res, { data: officers });
});

const userController = {
  getProfile,
  updateProfile,
  updateFCMToken,
  listUsers,
  getUserById,
  deactivateUser,
  activateUser,
  getWardOfficers,
};

export default userController;
