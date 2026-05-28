import mongoose, { Document } from 'mongoose';

export interface ISchemeApplication extends Document {
  scheme: mongoose.Types.ObjectId;
  citizen: mongoose.Types.ObjectId;
  status: string;
  submittedDocuments: {
    documentName: string;
    url: string;
    publicId?: string;
  }[];
  applicationData?: Record<string, unknown>;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schemeApplicationSchema = new mongoose.Schema<ISchemeApplication>(
  {
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheme',
      required: true,
      index: true,
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['applied', 'approved', 'rejected'],
      default: 'applied',
      index: true,
    },
    submittedDocuments: [
      {
        documentName: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        publicId: String,
      },
    ],
    applicationData: {
      type: mongoose.Schema.Types.Mixed,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for common query pattern: list by citizen, or list by scheme
schemeApplicationSchema.index({ citizen: 1, scheme: 1 }, { unique: true }); // Prevent multiple applications for the same scheme by the same citizen
schemeApplicationSchema.index({ scheme: 1, status: 1 });

const SchemeApplication = mongoose.model<ISchemeApplication>('SchemeApplication', schemeApplicationSchema);

export default SchemeApplication;
