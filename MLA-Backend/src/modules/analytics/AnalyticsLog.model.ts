/**
 * Analytics Log Model
 * Precomputed analytics snapshots for dashboard performance.
 * Avoids expensive real-time aggregation queries on free-tier MongoDB.
 */
import mongoose, { Document } from 'mongoose';

export interface IAnalyticsLog extends Document {
  type: string;
  period: string;
  ward?: number;
  officerId?: mongoose.Types.ObjectId;
  department?: string;
  metrics: {
    totalComplaints: number;
    resolvedComplaints: number;
    pendingComplaints: number;
    escalatedComplaints: number;
    slaCompliant: number;
    slaBreached: number;
    avgResolutionHours: number;
    citizenSatisfaction: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    categoryBreakdown?: Map<string, number>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const analyticsLogSchema = new mongoose.Schema<IAnalyticsLog>(
  {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'ward', 'officer', 'department'],
      required: true,
      index: true,
    },
    period: {
      type: String, // e.g., '2026-05-19', '2026-W20', '2026-05'
      required: true,
    },
    ward: {
      type: Number,
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    department: String,
    metrics: {
      totalComplaints: { type: Number, default: 0 },
      resolvedComplaints: { type: Number, default: 0 },
      pendingComplaints: { type: Number, default: 0 },
      escalatedComplaints: { type: Number, default: 0 },
      slaCompliant: { type: Number, default: 0 },
      slaBreached: { type: Number, default: 0 },
      avgResolutionHours: { type: Number, default: 0 },
      citizenSatisfaction: { type: Number, default: 0 },
      // Priority breakdown
      criticalCount: { type: Number, default: 0 },
      highCount: { type: Number, default: 0 },
      mediumCount: { type: Number, default: 0 },
      lowCount: { type: Number, default: 0 },
      // Category breakdown
      categoryBreakdown: { type: Map, of: Number },
    },
  },
  {
    timestamps: true,
  }
);

analyticsLogSchema.index({ type: 1, period: 1, ward: 1 });
analyticsLogSchema.index({ type: 1, period: 1, officerId: 1 });

const AnalyticsLog = mongoose.model<IAnalyticsLog>('AnalyticsLog', analyticsLogSchema);

export default AnalyticsLog;
