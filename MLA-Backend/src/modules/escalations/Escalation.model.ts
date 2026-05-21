/**
 * Escalation Model
 * Tracks complaint escalations through the governance hierarchy.
 */
import mongoose, { Document } from 'mongoose';

export interface IEscalation extends Document {
  complaint: mongoose.Types.ObjectId;
  fromLevel: string;
  toLevel: string;
  fromUser?: mongoose.Types.ObjectId;
  toUser?: mongoose.Types.ObjectId;
  reason: string;
  notes?: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const escalationSchema = new mongoose.Schema<IEscalation>(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    fromLevel: {
      type: String,
      enum: ['service_officer', 'ward_councillor', 'mla'],
      required: true,
    },
    toLevel: {
      type: String,
      enum: ['ward_councillor', 'mla'],
      required: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      enum: ['sla_breach', 'inactivity', 'unresolved', 'manual', 'citizen_request'],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

escalationSchema.index({ complaint: 1, createdAt: -1 });
escalationSchema.index({ toUser: 1, isResolved: 1 });

const Escalation = mongoose.model<IEscalation>('Escalation', escalationSchema);

export default Escalation;
