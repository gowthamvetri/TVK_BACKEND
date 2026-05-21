/**
 * Announcement Model
 * Public announcements from MLA/Ward Councillors to citizens.
 */
import mongoose, { Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  author: mongoose.Types.ObjectId;
  authorRole: string;
  category: string;
  targetWards: number[];
  images?: {
    url?: string;
    publicId?: string;
  }[];
  isActive: boolean;
  expiresAt?: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new mongoose.Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: [true, 'Announcement body is required'],
      trim: true,
      maxlength: 5000,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorRole: {
      type: String,
      enum: ['mla', 'ward_councillor'],
      required: true,
    },
    category: {
      type: String,
      enum: ['announcement', 'event'],
      default: 'general',
    },
    targetWards: [
      {
        type: Number, // Empty array = all wards (constituency-wide)
      },
    ],
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: Date,
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ isActive: 1, createdAt: -1 });
announcementSchema.index({ targetWards: 1, isActive: 1 });

const Announcement = mongoose.model<IAnnouncement>('Announcement', announcementSchema);

export default Announcement;
