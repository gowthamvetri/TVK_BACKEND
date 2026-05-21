/**
 * Department Model
 * Maps complaint categories to departments for automatic assignment.
 */
import mongoose, { Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  categories: string[];
  headOfficer?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new mongoose.Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    headOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Department = mongoose.model<IDepartment>('Department', departmentSchema);

export default Department;
