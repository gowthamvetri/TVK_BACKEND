/**
 * Notification Service
 * Handles in-app notifications.
 *
 * Architecture:
 * - In-app: Store in MongoDB + emit via Socket.IO (real-time)
 */
import { Server } from 'socket.io';
import Notification from './Notification.model';
import { buildPaginationQuery } from '../../shared/utils/helpers';
import logger from '../../shared/logger';

let socketIO: Server | null = null;

/**
 * Inject Socket.IO instance
 */
const setSocketIO = (io: Server) => {
  socketIO = io;
};

/**
 * Send notification to a single user
 */
const sendNotification = async ({
  recipientId,
  title,
  body,
  type = 'general',
  data = {},
  channels = ['in_app'],
}: {
  recipientId: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
  channels?: string[];
}) => {
  try {
    // 1. Store in-app notification
    const notification = await Notification.create({
      recipient: recipientId,
      title,
      body,
      type,
      data,
      channels,
    });

    // 2. Emit via Socket.IO for real-time delivery
    if (socketIO && channels.includes('in_app')) {
      socketIO.to(`user:${recipientId}`).emit('notification', {
        id: notification._id,
        title,
        body,
        type,
        data,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    logger.error('[NotificationService] Failed to send notification:', error);
    return null;
  }
};

/**
 * Send notification to multiple users
 */
const sendBulkNotification = async ({
  recipientIds,
  title,
  body,
  type = 'general',
  data = {},
  channels = ['in_app'],
}: {
  recipientIds: string[];
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
  channels?: string[];
}) => {
  const notifications = recipientIds.map((recipientId) => ({
    recipient: recipientId,
    title,
    body,
    type,
    data,
    channels,
  }));

  await Notification.insertMany(notifications);

  // Real-time delivery
  if (socketIO && channels.includes('in_app')) {
    recipientIds.forEach((recipientId) => {
      socketIO?.to(`user:${recipientId}`).emit('notification', {
        title,
        body,
        type,
        data,
        createdAt: new Date(),
      });
    });
  }

  logger.info(`[NotificationService] Bulk notification sent to ${recipientIds.length} users`);
};

export interface INotificationFilterQuery {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: string;
  isRead?: string | boolean;
  type?: string;
  [key: string]: unknown;
}

/**
 * Get user notifications
 */
const getUserNotifications = async (userId: string, query: INotificationFilterQuery) => {
  const { page, limit, skip, sort } = buildPaginationQuery(query);
  const filter: Record<string, unknown> = { recipient: userId };

  if (query.isRead !== undefined) {
    filter.isRead = query.isRead === 'true';
  }
  if (query.type) {
    filter.type = query.type;
  }

  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return { data, total, unreadCount, page, limit };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId: string, userId: string) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId: string) => {
  return Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId: string) => {
  return Notification.countDocuments({ recipient: userId, isRead: false });
};

const notificationService = {
  setSocketIO,
  sendNotification,
  sendBulkNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};

export default notificationService;
