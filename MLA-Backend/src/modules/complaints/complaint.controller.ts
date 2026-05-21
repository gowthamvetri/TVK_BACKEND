/**
 * Complaint Controller
 */
import { Request, Response } from 'express';
import { ParsedQs } from 'qs';
import complaintService, { IComplaintQuery, ICreateComplaintDTO } from './complaint.service';
import uploadService from '../uploads/upload.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

interface IUpdateStatusBody {
  status: string;
  notes?: string;
}

interface IResolutionProofBody {
  proofImages: string[];
  notes?: string;
}

type INearbyComplaintsQuery = ParsedQs;

const createComplaint = asyncHandler(async (req: Request<unknown, unknown, ICreateComplaintDTO>, res: Response) => {
  const complaintData: ICreateComplaintDTO = { ...req.body };

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const filePaths = (req.files as Express.Multer.File[]).map((file) => file.path);
    const uploadedImages = await uploadService.uploadMultiple(filePaths, 'mla-grievance/complaints');
    complaintData.images = uploadedImages;
  }

  const complaint = await complaintService.createComplaint(req.user!.id, complaintData);
  return ApiResponse.created(res, { data: complaint, message: 'Complaint submitted successfully' });
});

const getComplaintById = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await complaintService.getComplaintById(req.params.id);
  return ApiResponse.success(res, { data: complaint });
});

const getComplaintByTrackingId = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await complaintService.getComplaintByTrackingId(req.params.trackingId);
  return ApiResponse.success(res, { data: complaint });
});

const listComplaints = asyncHandler(async (req: Request<unknown, unknown, unknown, IComplaintQuery>, res: Response) => {
  const { data, total, page, limit } = await complaintService.listComplaints(req.query, req.user!);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const updateStatus = asyncHandler(async (req: Request<{ id: string }, unknown, IUpdateStatusBody>, res: Response) => {
  const complaint = await complaintService.updateStatus(
    req.params.id,
    req.body.status,
    req.user!.id,
    req.user!.role,
    req.body.notes || ''
  );
  return ApiResponse.success(res, { data: complaint, message: 'Status updated' });
});

const addResolutionProof = asyncHandler(async (req: Request<{ id: string }, unknown, IResolutionProofBody>, res: Response) => {
  const complaint = await complaintService.addResolutionProof(
    req.params.id,
    req.body.proofImages,
    req.body.notes || '',
    req.user!.id
  );
  return ApiResponse.success(res, { data: complaint, message: 'Resolution proof added' });
});

const getTimeline = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const timeline = await complaintService.getComplaintTimeline(req.params.id);
  return ApiResponse.success(res, { data: timeline });
});

const upvoteComplaint = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const complaint = await complaintService.upvoteComplaint(req.params.id, req.user!.id);
  return ApiResponse.success(res, { data: complaint, message: 'Complaint upvoted' });
});

const removeUpvote = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const complaint = await complaintService.removeUpvote(req.params.id, req.user!.id);
  return ApiResponse.success(res, { data: complaint, message: 'Upvote removed' });
});

const getNearbyComplaints = asyncHandler(async (req: Request<unknown, unknown, unknown, INearbyComplaintsQuery>, res: Response) => {
  const { longitude, latitude, maxDistance } = req.query;
  const longitudeValue = typeof longitude === 'string' ? longitude : '';
  const latitudeValue = typeof latitude === 'string' ? latitude : '';
  const maxDistanceValue = typeof maxDistance === 'string' ? maxDistance : '';
  console.log(longitudeValue, latitudeValue, maxDistanceValue);
  const complaints = await complaintService.getNearbyComplaints(
    parseFloat(longitudeValue),
    parseFloat(latitudeValue),
    parseInt(maxDistanceValue || '', 10) || 500
  );
  return ApiResponse.success(res, { data: complaints });
});

const complaintController = {
  createComplaint,
  getComplaintById,
  getComplaintByTrackingId,
  listComplaints,
  updateStatus,
  addResolutionProof,
  getTimeline,
  upvoteComplaint,
  removeUpvote,
  getNearbyComplaints,
};

export default complaintController;
