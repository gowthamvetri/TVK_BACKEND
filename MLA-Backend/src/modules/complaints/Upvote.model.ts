/**
 * Upvote Model
 * Tracks citizen upvotes on complaints.
 * One upvote per citizen per complaint enforced by unique compound index.
 */
import mongoose, { Document } from 'mongoose';

export interface IUpvote extends Document {
  complaint: mongoose.Types.ObjectId;
  citizen: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const upvoteSchema = new mongoose.Schema<IUpvote>(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce one upvote per citizen per complaint
upvoteSchema.index({ complaint: 1, citizen: 1 }, { unique: true });

const Upvote = mongoose.model<IUpvote>('Upvote', upvoteSchema);

export default Upvote;
