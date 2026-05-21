/**
 * Notification Model
 * Stores in-app notifications for all users.
 */
import mongoose, { Document } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  channels: string[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema<INotification>(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'complaint_created',
        'complaint_assigned',
        'complaint_status_changed',
        'complaint_resolved',
        'complaint_verified',
        'complaint_escalated',
        'sla_warning',
        'sla_breached',
        'announcement',
        'general',
      ],
      default: 'general',
    },
    data: {
      type: mongoose.Schema.Types.Mixed, // Link to related entity
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    channels: [
      {
        type: String,
        enum: ['push', 'sms', 'in_app'],
      },
    ],
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
