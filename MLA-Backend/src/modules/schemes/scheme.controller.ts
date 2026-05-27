/**
 * Scheme Controller
 */
import { Request, Response } from 'express';
import schemeService, { ISchemeCreateDTO, ISchemeImage, ISchemeListQuery, ISchemeUpdateDTO } from './scheme.service';
import uploadService from '../uploads/upload.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

type SchemeRequestBody = ISchemeCreateDTO & { images?: string | ISchemeImage[] };

const create = asyncHandler(async (req: Request<unknown, unknown, SchemeRequestBody>, res: Response) => {
  const { images, requiredDocuments, ...rest } = req.body;
  const schemeData: ISchemeCreateDTO = {
    ...rest,
    ...(Array.isArray(images) ? { images } : {}),
  };

  if (typeof requiredDocuments === 'string') {
    try {
      schemeData.requiredDocuments = JSON.parse(requiredDocuments);
    } catch {
      // Ignored, handled by validation
    }
  } else if (Array.isArray(requiredDocuments)) {
    schemeData.requiredDocuments = requiredDocuments;
  }

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const filePaths = req.files.map((file: Express.Multer.File) => file.path);
    const uploadedImages = await uploadService.uploadMultiple(filePaths, 'mla-grievance/schemes');
    schemeData.images = uploadedImages;
  }

  const scheme = await schemeService.create(req.user!.id, schemeData);
  return ApiResponse.created(res, { data: scheme });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
  const scheme = await schemeService.getById(req.params.id);
  return ApiResponse.success(res, { data: scheme });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, ISchemeListQuery>, res: Response) => {
  const { data, total, page, limit } = await schemeService.list(req.query);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const update = asyncHandler(async (req: Request<{ id: string }, unknown, SchemeRequestBody>, res: Response) => {
  const { images, requiredDocuments, ...rest } = req.body;
  let parsedImages: ISchemeImage[] | undefined;

  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        parsedImages = parsed as ISchemeImage[];
      }
    } catch {
      // Leave as-is; validator or service will handle invalid input
    }
  } else if (Array.isArray(images)) {
    parsedImages = images;
  }

  const schemeData: ISchemeUpdateDTO = {
    ...rest,
    ...(parsedImages ? { images: parsedImages } : {}),
  };

  if (typeof requiredDocuments === 'string') {
    try {
      schemeData.requiredDocuments = JSON.parse(requiredDocuments);
    } catch {
      // Ignored
    }
  } else if (Array.isArray(requiredDocuments)) {
    schemeData.requiredDocuments = requiredDocuments;
  }

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const filePaths = req.files.map((file: Express.Multer.File) => file.path);
    const uploadedImages = await uploadService.uploadMultiple(filePaths, 'mla-grievance/schemes');
    const existingImages = schemeData.images || [];
    schemeData.images = [...existingImages, ...uploadedImages];
  }

  const scheme = await schemeService.update(req.params.id, schemeData);
  return ApiResponse.success(res, { data: scheme, message: 'Scheme updated' });
});

const deactivate = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await schemeService.deactivate(req.params.id);
  return ApiResponse.success(res, { message: 'Scheme deactivated' });
});

export default {
  create,
  getById,
  list,
  update,
  deactivate
};
