/**
 * Upload Controller
 * SECURITY: Enforces authorization and ownership verification
 */
import { Request, Response } from 'express';
import uploadService from './upload.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';
import { BadRequestError, ForbiddenError } from '../../shared/utils/errors';
import complaintRepository from '../complaints/complaint.repository';
import { ROLES } from '../../shared/constants';
import userService from '../users/user.service';

interface IUploadBody {
  folder?: string;
  resourceId?: string;
  resourceType?: string;
}

interface IDeleteImageBody {
  publicId: string;
  resourceId?: string;
  resourceType?: string;
}

// SECURITY: Allowed Cloudinary folders for uploads (allowlist)
const ALLOWED_UPLOAD_FOLDERS = ['mla-grievance'];

// SECURITY: Map resourceType to allowed folder
const getFolder = (resourceType?: string): string => {
  // Default folder for all resource types
  return 'mla-grievance';
};

const uploadSingle = asyncHandler(async (req: Request<{}, {}, IUploadBody>, res: Response) => {
  if (!req.file) throw new BadRequestError('No file uploaded');
  
  // SECURITY: Ignore client-provided folder, use server-side determined folder only
  const folder = getFolder(req.body.resourceType);
  
  // SECURITY: Store metadata for ownership tracking
  const metadata = {
    resourceId: req.body.resourceId,
    resourceType: req.body.resourceType,
  };
  
  const result = await uploadService.uploadImage(req.file.path, folder, metadata);
  return ApiResponse.success(res, { data: result, message: 'Image uploaded' });
});

const uploadMultiple = asyncHandler(async (req: Request<{}, {}, IUploadBody>, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) throw new BadRequestError('No files uploaded');
  const files = req.files as Express.Multer.File[];
  const filePaths = files.map((f) => f.path);
  
  // SECURITY: Ignore client-provided folder, use server-side determined folder only
  const folder = getFolder(req.body.resourceType);
  
  // SECURITY: Store metadata for ownership tracking
  const metadata = {
    resourceId: req.body.resourceId,
    resourceType: req.body.resourceType,
  };
  
  const results = await uploadService.uploadMultiple(filePaths, folder, metadata);
  return ApiResponse.success(res, { data: results, message: 'Images uploaded' });
});

const deleteImage = asyncHandler(async (req: Request<{}, {}, IDeleteImageBody>, res: Response) => {
  const { publicId, resourceId, resourceType } = req.body;
  const user = req.user!;
  
  // SECURITY: Enforce ownership verification for deletions
  // Require both resourceId and resourceType to be provided
  if (!resourceId || !resourceType) {
    throw new BadRequestError('Resource identification required for deletion (resourceId and resourceType)');
  }

  // SECURITY: Only allow deletion for supported resource types (complaint attachments for now)
  if (resourceType !== 'complaint') {
    throw new ForbiddenError(`Deletion not supported for resource type: ${resourceType}`);
  }

  // SECURITY: Verify user owns the resource being modified
  if (resourceType === 'complaint' && resourceId) {
    const complaint = await complaintRepository.findById(resourceId);
    if (!complaint) {
      throw new BadRequestError('Resource not found');
    }

    // Only citizen who created it, assigned officer, or MLA can delete attachments
    const isOwner = complaint.citizen?.toString() === user.id;
    const isAssignedOfficer = complaint.assignedOfficer?.toString() === user.id;
    const isMLA = user.role === ROLES.MLA;
    
    // SECURITY: Ward councillors can delete attachments if complaint is in their ward
    let isWardCouncillor = false;
    if (user.role === ROLES.WARD_COUNCILLOR) {
      isWardCouncillor = complaint.ward === user.ward;
    }

    if (!isOwner && !isAssignedOfficer && !isMLA && !isWardCouncillor) {
      throw new ForbiddenError('Insufficient permissions to delete this resource');
    }
  }

  // SECURITY: Pass ownership info to service for verification
  await uploadService.deleteImage(publicId, resourceId);
  return ApiResponse.success(res, { message: 'Image deleted' });
});

export default {
  uploadSingle,
  uploadMultiple,
  deleteImage
};
