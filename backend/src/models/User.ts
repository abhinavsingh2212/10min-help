import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@10min-help/shared';

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  lastLoginAt?: Date;
  emergencyContactPhone?: string;
  emergencyContactName?: string;
  refreshTokenHash?: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      index: true,
    },
    isActive: { type: Boolean, default: true },
    avatarUrl: { type: String },
    lastLoginAt: { type: Date },
    emergencyContactPhone: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    refreshTokenHash: { type: String, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
