/**
 * Complaint Status History Model
 * Tracks every status change for a complaint (timeline feature).
 */
import mongoose, { Document } from 'mongoose';
import { COMPLAINT_STATUS } from '../../shared/constants';

export interface IComplaintStatusHistory extends Document {
  complaint: mongoose.Types.ObjectId;
  fromStatus?: string | null;
  toStatus: string;
  changedBy: mongoose.Types.ObjectId;
  changedByRole?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new mongoose.Schema<IComplaintStatusHistory>(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: [...Object.values(COMPLAINT_STATUS), null],
    },
    toStatus: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedByRole: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // For extra context (e.g., reassignment reason)
    },
  },
  {
    timestamps: true,
  }
);

statusHistorySchema.index({ complaint: 1, createdAt: 1 });

const ComplaintStatusHistory = mongoose.model<IComplaintStatusHistory>('ComplaintStatusHistory', statusHistorySchema);

export default ComplaintStatusHistory;
