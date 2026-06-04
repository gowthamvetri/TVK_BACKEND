/**
 * Official Registry Model
 * Stores pre-registered officials and their roles for registration.
 */
import mongoose, { Document } from 'mongoose';
import { ROLES } from '../../shared/constants';

export interface IOfficialRegistry extends Document {
  phone: string;
  role: string;
  department?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const officialRegistrySchema = new mongoose.Schema<IOfficialRegistry>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: [ROLES.SERVICE_OFFICER, ROLES.WARD_COUNCILLOR, ROLES.MLA],
      required: [true, 'Role is required'],
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

officialRegistrySchema.index({ phone: 1 }, { unique: true });

const OfficialRegistry = mongoose.model<IOfficialRegistry>('OfficialRegistry', officialRegistrySchema);

export default OfficialRegistry;
