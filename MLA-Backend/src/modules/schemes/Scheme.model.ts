/**
 * Scheme Model
 * Government schemes and events visible to citizens.
 */
import mongoose, { Document } from 'mongoose';

export interface IScheme extends Document {
  title: string;
  description: string;
  category: string;
  eligibility?: string;
  benefits?: string;
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
  dynamicFields?: {
    label: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
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
    category: {
      type: String,
      enum: [
        'all',
        'women',
        'men',
        'children',
        'transgender_people',
        'school_students',
        'college_students',
        'senior_citizens',
        'people_with_disabilities'
      ],
      default: 'all',
    },
    eligibility: {
      type: String,
      trim: true,
    },
    benefits: {
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
    dynamicFields: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ['text', 'number', 'select'],
          required: true,
        },
        options: [String],
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
