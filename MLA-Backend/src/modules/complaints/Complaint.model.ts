/**
 * Complaint Model
 * Core entity of the grievance management system.
 */
import mongoose, { Document } from 'mongoose';
import { COMPLAINT_STATUS, COMPLAINT_PRIORITY, COMPLAINT_CATEGORIES } from '../../shared/constants';

export interface IComplaint extends Document {
  trackingId: string;
  citizen: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  ward: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  address?: string;
  landmark?: string;
  images?: {
    url?: string;
    publicId?: string;
    caption?: string;
  }[];
  assignedOfficer?: mongoose.Types.ObjectId;
  department?: string;
  slaDeadline?: Date;
  slaBreached: boolean;
  resolutionNotes?: string;
  resolutionProof?: {
    url?: string;
    publicId?: string;
  }[];
  resolvedAt?: Date;
  verifiedAt?: Date;
  closedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  upvoteCount: number;
  escalationLevel: number;
  isEscalated: boolean;
  isDuplicate: boolean;
  duplicateOf?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new mongoose.Schema<IComplaint>(
  {
    trackingId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: Object.values(COMPLAINT_CATEGORIES),
      required: [true, 'Category is required'],
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(COMPLAINT_PRIORITY),
      default: COMPLAINT_PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      default: COMPLAINT_STATUS.CREATED,
      index: true,
    },
    ward: {
      type: Number,
      required: [true, 'Ward number is required'],
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    address: String,
    landmark: String,
    images: [
      {
        url: String,
        publicId: String,
        caption: String,
      },
    ],
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    department: {
      type: String,
      trim: true,
      index: true,
    },
    // SLA tracking
    slaDeadline: {
      type: Date,
      index: true,
    },
    slaBreached: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Resolution
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    resolutionProof: [
      {
        url: String,
        publicId: String,
      },
    ],
    resolvedAt: Date,
    verifiedAt: Date,
    closedAt: Date,
    // Verification
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    // Upvotes (count stored here, details in Upvote collection)
    upvoteCount: {
      type: Number,
      default: 0,
    },
    // Escalation tracking
    escalationLevel: {
      type: Number,
      default: 0, // 0 = not escalated, 1 = ward councillor, 2 = MLA
    },
    isEscalated: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Duplicate detection
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// GeoJSON index for location-based queries
complaintSchema.index({ 'location': '2dsphere' });

// Compound indexes for common query patterns
complaintSchema.index({ status: 1, ward: 1, createdAt: -1 });
complaintSchema.index({ assignedOfficer: 1, status: 1 });
complaintSchema.index({ citizen: 1, createdAt: -1 });
complaintSchema.index({ category: 1, status: 1, ward: 1 });
complaintSchema.index({ slaBreached: 1, status: 1 });

// Virtual for status history
complaintSchema.virtual('statusHistory', {
  ref: 'ComplaintStatusHistory',
  localField: '_id',
  foreignField: 'complaint',
});

const Complaint = mongoose.model<IComplaint>('Complaint', complaintSchema);

export default Complaint;
