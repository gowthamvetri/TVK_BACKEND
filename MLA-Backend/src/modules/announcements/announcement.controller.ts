/**
 * Announcement Controller
 */
import { Request, Response } from 'express';
import announcementService, { IAnnouncementCreateDTO, IAnnouncementListQuery, IAnnouncementUpdateDTO } from './announcement.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

const create = asyncHandler(async (req: Request<unknown, unknown, IAnnouncementCreateDTO>, res: Response) => {
  const announcement = await announcementService.create(req.user!.id, req.user!.role, req.body);
  return ApiResponse.created(res, { data: announcement });
});

const getById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const announcement = await announcementService.getById(req.params.id);
  return ApiResponse.success(res, { data: announcement });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, IAnnouncementListQuery>, res: Response) => {
  const { data, total, page, limit } = await announcementService.list(req.query);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const update = asyncHandler(async (req: Request<{ id: string }, unknown, IAnnouncementUpdateDTO>, res: Response) => {
  const announcement = await announcementService.update(req.params.id, req.body);
  return ApiResponse.success(res, { data: announcement, message: 'Announcement updated' });
});

const deactivate = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await announcementService.deactivate(req.params.id);
  return ApiResponse.success(res, { message: 'Announcement deactivated' });
});

export default {
  create,
  getById,
  list,
  update,
  deactivate
};
