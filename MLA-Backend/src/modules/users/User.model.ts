/**
 * User Model
 * Supports all four roles: citizen, service_officer, ward_councillor, mla
 */
import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../../shared/constants';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  phone: string;
  pin?: string;
  role: string;
  ward?: number;
  department?: string;
  profileImage?: string;
  address?: {
    street?: string;
    area?: string;
    city?: string;
    pincode?: string;
  };
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  oauthProviders?: {
    google?: { id?: string };
    microsoft?: { id?: string };
  };
  permissions?: string[];
  isFormerCouncillor?: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePin(candidatePin: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    pin: {
      type: String,
      required: [true, 'PIN is required'],
      select: false, // Never return PIN in queries by default
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CITIZEN,
      index: true,
    },
    ward: {
      type: Number,
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
    },
    address: {
      street: String,
      area: String,
      city: String,
      pincode: String,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    permissions: {
      type: [String],
      default: undefined,
    },
    isFormerCouncillor: {
      type: Boolean,
      default: false,
    },
    // Future OAuth placeholders
    oauthProviders: {
      google: { id: String },
      microsoft: { id: String },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common queries
userSchema.index({ role: 1, ward: 1 });
userSchema.index({ role: 1, department: 1 });
userSchema.index({ phone: 1 }, { unique: true });

// Hash PIN before saving
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('pin') || !this.pin) return next();
  const hashed = await bcrypt.hash(this.pin, 10);
  this.pin = hashed;
  next();
});

// Compare PIN
userSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
  return bcrypt.compare(candidatePin, this.pin);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.pin;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
