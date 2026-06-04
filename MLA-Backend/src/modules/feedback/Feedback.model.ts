/**
 * Feedback Model
 */
import mongoose, { Document } from 'mongoose';

export interface IFeedback extends Document {
  citizen: mongoose.Types.ObjectId;
  message: string;
  ward?: number;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new mongoose.Schema<IFeedback>(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required'],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Feedback message is required'],
      trim: true,
      maxlength: 2000,
    },
    ward: {
      type: Number,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ ward: 1, createdAt: -1 });

const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);

export default Feedback;
