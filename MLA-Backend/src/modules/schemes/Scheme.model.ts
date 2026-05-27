/**
 * Scheme Model
 * Government schemes and events visible to citizens.
 */
import mongoose, { Document } from 'mongoose';

export interface IScheme extends Document {
  title: string;
  description: string;
  type: string;
  eligibility?: string;
  benefits?: string;
  applicationLink?: string;
  startDate?: Date;
  endDate?: Date;
  images?: {
    url?: string;
    publicId?: string;
  }[];
  targetWards: number[];
  requiredDocuments?: {
    name: string;
    isRequired: boolean;
  }[];
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schemeSchema = new mongoose.Schema<IScheme>(
  {
    title: {
      type: String,
      required: [true, 'Scheme title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ['scheme', 'event', 'program'],
      default: 'scheme',
    },
    eligibility: {
      type: String,
      trim: true,
    },
    benefits: {
      type: String,
      trim: true,
    },
    applicationLink: {
      type: String,
      trim: true,
    },
    startDate: Date,
    endDate: Date,
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    targetWards: [Number],
    requiredDocuments: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        isRequired: {
          type: Boolean,
          default: true,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

schemeSchema.index({ isActive: 1, createdAt: -1 });

const Scheme = mongoose.model<IScheme>('Scheme', schemeSchema);

export default Scheme;
