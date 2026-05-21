/**
 * Official Registry Controller
 */
import { Request, Response } from 'express';
import officialsService from './officials.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';
import { BadRequestError } from '../../shared/utils/errors';

const resolveUploadedFile = (req: Request): Express.Multer.File | undefined => {
  if (req.file) return req.file;
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | Express.Multer.File[]
    | undefined;
  if (!files) return undefined;
  if (Array.isArray(files)) return files[0];
  return files.file?.[0] || files.csv?.[0];
};

const uploadCsv = asyncHandler(async (req: Request, res: Response) => {
  const uploadedFile = resolveUploadedFile(req);
  if (!uploadedFile) {
    throw new BadRequestError('CSV file is required');
  }

  const result = await officialsService.importOfficialsFromCsv(uploadedFile.path, req.user!.id);
  return ApiResponse.success(res, { data: result, message: 'Official registry updated' });
});

export default {
  uploadCsv,
};
