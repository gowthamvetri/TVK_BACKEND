/**
 * Upload Controller
 */
import { Request, Response } from 'express';
import uploadService from './upload.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';
import { BadRequestError } from '../../shared/utils/errors';

interface IUploadBody {
  folder?: string;
}

interface IDeleteImageBody {
  publicId: string;
}

const uploadSingle = asyncHandler(async (req: Request<{}, {}, IUploadBody>, res: Response) => {
  if (!req.file) throw new BadRequestError('No file uploaded');
  const result = await uploadService.uploadImage(req.file.path, req.body.folder || 'mla-grievance');
  return ApiResponse.success(res, { data: result, message: 'Image uploaded' });
});

const uploadMultiple = asyncHandler(async (req: Request<{}, {}, IUploadBody>, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) throw new BadRequestError('No files uploaded');
  const files = req.files as Express.Multer.File[];
  const filePaths = files.map((f) => f.path);
  const results = await uploadService.uploadMultiple(filePaths, req.body.folder || 'mla-grievance');
  return ApiResponse.success(res, { data: results, message: 'Images uploaded' });
});

const deleteImage = asyncHandler(async (req: Request<{}, {}, IDeleteImageBody>, res: Response) => {
  await uploadService.deleteImage(req.body.publicId);
  return ApiResponse.success(res, { message: 'Image deleted' });
});

export default {
  uploadSingle,
  uploadMultiple,
  deleteImage
};
