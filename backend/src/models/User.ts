import { Schema, model, Document, Types } from 'mongoose';

export type GlobalRole = 'super_admin' | 'member';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  totpSecret?: string;
  isTotpEnabled: boolean;
  globalRole: GlobalRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatar: { type: String },
    totpSecret: { type: String },
    isTotpEnabled: { type: Boolean, default: false },
    globalRole: { type: String, enum: ['super_admin', 'member'], default: 'member' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);


export const User = model<IUser>('User', userSchema);
