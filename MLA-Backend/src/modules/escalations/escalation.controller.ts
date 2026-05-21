/**
 * Escalation Controller
 */
import { Request, Response } from 'express';
import escalationService from './escalation.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

const escalateComplaint = asyncHandler(async (req: Request, res: Response) => {
  const escalation = await escalationService.escalateComplaint(
    req.params.complaintId,
    req.body.reason,
    req.body.notes,
    req.user!.id
  );
  return ApiResponse.created(res, { data: escalation, message: 'Complaint escalated' });
});

const resolveEscalation = asyncHandler(async (req: Request, res: Response) => {
  const escalation = await escalationService.resolveEscalation(req.params.id, req.user!.id);
  return ApiResponse.success(res, { data: escalation, message: 'Escalation resolved' });
});

const getEscalations = asyncHandler(async (req: Request, res: Response) => {
  const { data, total, page, limit } = await escalationService.getEscalations(req.query, req.user!);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

const getComplaintEscalations = asyncHandler(async (req: Request, res: Response) => {
  const escalations = await escalationService.getComplaintEscalations(req.params.complaintId);
  return ApiResponse.success(res, { data: escalations });
});

const escalationController = {
  escalateComplaint,
  resolveEscalation,
  getEscalations,
  getComplaintEscalations,
};

export default escalationController;
