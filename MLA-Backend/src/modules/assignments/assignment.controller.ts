/**
 * Assignment Controller
 */
import { Request, Response } from 'express';
import assignmentService from './assignment.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

const reassign = asyncHandler(async (req: Request, res: Response) => {
  const { officerId, reason } = req.body;
  const complaint = await assignmentService.reassign(
    req.params.complaintId,
    officerId,
    req.user!.id,
    reason
  );
  return ApiResponse.success(res, { data: complaint, message: 'Complaint reassigned' });
});

const getOfficerWorkload = asyncHandler(async (req: Request, res: Response) => {
  const workload = await assignmentService.getOfficerWorkload(req.params.officerId);
  return ApiResponse.success(res, { data: workload });
});

const assignmentController = {
  reassign,
  getOfficerWorkload,
};

export default assignmentController;
