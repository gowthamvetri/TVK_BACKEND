/**
 * Event Controller
 */
import { Request, Response } from 'express';
import eventService, { IEventCreateDTO, IEventListQuery, IEventUpdateDTO } from './event.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';
import uploadService from '../uploads/upload.service';

type EventRequestBody = IEventCreateDTO & { images?: string | import('./event.service').IEventImage[] };

const create = asyncHandler(async (req: Request<unknown, unknown, EventRequestBody>, res: Response) => {
  const { images, ...rest } = req.body;
  const eventData: IEventCreateDTO = {
    ...rest,
    ...(Array.isArray(images) ? { images } : {}),
  };

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const filePaths = req.files.map((file: Express.Multer.File) => file.path);
    const uploadedImages = await uploadService.uploadMultiple(filePaths, 'mla-grievance/events');
    eventData.images = uploadedImages;
  }

  const eventDoc = await eventService.create(req.user!.id, req.user!.role, eventData);
  return ApiResponse.created(res, { data: eventDoc });
});

const getById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const eventDoc = await eventService.getById(req.params.id);
  return ApiResponse.success(res, { data: eventDoc });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, IEventListQuery>, res: Response) => {
  const { data, total, page, limit } = await eventService.list(req.query);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const update = asyncHandler(async (req: Request<{ id: string }, unknown, EventRequestBody>, res: Response) => {
  const { images, ...rest } = req.body;
  let parsedImages: import('./event.service').IEventImage[] | undefined;

  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        parsedImages = parsed as import('./event.service').IEventImage[];
      }
    } catch {
      // Leave as-is; validator or service will handle invalid input
    }
  } else if (Array.isArray(images)) {
    parsedImages = images;
  }

  const eventData: IEventUpdateDTO = {
    ...rest,
    ...(parsedImages ? { images: parsedImages } : {}),
  };

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const filePaths = req.files.map((file: Express.Multer.File) => file.path);
    const uploadedImages = await uploadService.uploadMultiple(filePaths, 'mla-grievance/events');
    const existingImages = eventData.images || [];
    eventData.images = [...existingImages, ...uploadedImages];
  }

  const eventDoc = await eventService.update(req.params.id, eventData);
  return ApiResponse.success(res, { data: eventDoc, message: 'Event updated' });
});

const deactivate = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await eventService.deactivate(req.params.id);
  return ApiResponse.success(res, { message: 'Event deactivated' });
});

export default {
  create,
  getById,
  list,
  update,
  deactivate
};
