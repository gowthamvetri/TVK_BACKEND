/**
 * Feedback Controller
 */
import { Request, Response } from 'express';
import feedbackService, { IFeedbackCreateDTO, IFeedbackListQuery } from './feedback.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

const create = asyncHandler(async (req: Request<unknown, unknown, IFeedbackCreateDTO>, res: Response) => {
  const data = { ...req.body };
  
  if (req.user?.ward) {
    data.ward = req.user.ward;
  } else {
    delete data.ward;
  }

  const feedback = await feedbackService.create(req.user!.id, data);
  return ApiResponse.created(res, { data: feedback, message: 'Feedback submitted successfully' });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, IFeedbackListQuery>, res: Response) => {
  const { data, total, page, limit } = await feedbackService.list(req.query);
  return ApiResponse.paginated(res, { data, total, page, limit });
});

export default {
  create,
  list,
};
