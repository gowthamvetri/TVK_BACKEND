/**
 * Announcement Controller
 */
import { Request, Response } from 'express';
import announcementService, { IAnnouncementCreateDTO, IAnnouncementListQuery, IAnnouncementUpdateDTO } from './announcement.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

import uploadService from '../uploads/upload.service';

type AnnouncementRequestBody = IAnnouncementCreateDTO & { images?: string | import('./announcement.service').IAnnouncementImage[] };

const create = asyncHandler(async (req: Request<unknown, unknown, AnnouncementRequestBody>, res: Response) => {
  const { images, ...rest } = req.body;
  const announcementData: IAnnouncementCreateDTO = {
    ...rest,
    ...(Array.isArray(images) ? { images } : {}),
  };

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const filePaths = req.files.map((file: Express.Multer.File) => file.path);
    const uploadedImages = await uploadService.uploadMultiple(filePaths, 'mla-grievance/announcements');
    announcementData.images = uploadedImages;
  }

  const announcement = await announcementService.create(req.user!.id, req.user!.role, announcementData);
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

const update = asyncHandler(async (req: Request<{ id: string }, unknown, AnnouncementRequestBody>, res: Response) => {
  const { images, ...rest } = req.body;
  let parsedImages: import('./announcement.service').IAnnouncementImage[] | undefined;

  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        parsedImages = parsed as import('./announcement.service').IAnnouncementImage[];
      }
    } catch {
      // Leave as-is; validator or service will handle invalid input
    }
  } else if (Array.isArray(images)) {
    parsedImages = images;
  }

  const announcementData: IAnnouncementUpdateDTO = {
    ...rest,
    ...(parsedImages ? { images: parsedImages } : {}),
  };

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const filePaths = req.files.map((file: Express.Multer.File) => file.path);
    const uploadedImages = await uploadService.uploadMultiple(filePaths, 'mla-grievance/announcements');
    const existingImages = announcementData.images || [];
    announcementData.images = [...existingImages, ...uploadedImages];
  }

  const announcement = await announcementService.update(req.params.id, announcementData);
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
