/**
 * Notification Controller
 */
import { Request, Response } from 'express';
import notificationService from './notification.service';
import ApiResponse from '../../shared/utils/ApiResponse';
import asyncHandler from '../../shared/utils/asyncHandler';

const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.getUserNotifications(req.user!.id, req.query);
  return ApiResponse.paginated(res, {
    data: result.data,
    total: result.total,
    page: result.page,
    limit: result.limit,
    message: 'Notifications retrieved',
  });
});

const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAsRead(req.params.id, req.user!.id);
  return ApiResponse.success(res, { message: 'Notification marked as read' });
});

const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllAsRead(req.user!.id);
  return ApiResponse.success(res, { message: 'All notifications marked as read' });
});

const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await notificationService.getUnreadCount(req.user!.id);
  return ApiResponse.success(res, { data: { unreadCount: count } });
});

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
};
