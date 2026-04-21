import { Schema, model, Document, Types } from 'mongoose';

export type NotifType =
  | 'review_request'
  | 'review_approved'
  | 'review_rejected'
  | 'client_review_request'
  | 'client_signed'
  | 'comment_added';

export interface INotification extends Document {
  _id:       Types.ObjectId;
  userId:    Types.ObjectId;
  type:      NotifType;
  title:     string;
  message:   string;
  link:      string;
  read:      boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, required: true },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    link:    { type: String, default: '' },
    read:    { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
