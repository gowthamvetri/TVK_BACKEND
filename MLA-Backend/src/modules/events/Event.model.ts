/**
 * Event Model
 * Public events hosted by MLA/Ward Councillors.
 */
import mongoose, { Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  eventDate: Date;
  venueName: string;
  author: mongoose.Types.ObjectId;
  authorRole: string;
  images?: {
    url?: string;
    publicId?: string;
  }[];
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new mongoose.Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: 5000,
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    venueName: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
      maxlength: 200,
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
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ isActive: 1, eventDate: -1 });

const EventModel = mongoose.model<IEvent>('Event', eventSchema);

export default EventModel;
