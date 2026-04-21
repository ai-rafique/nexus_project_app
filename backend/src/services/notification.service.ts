import { Notification, type NotifType } from '../models/Notification';
import type { Types } from 'mongoose';

export async function createNotification(
  userId: Types.ObjectId | string,
  type: NotifType,
  title: string,
  message: string,
  link = '',
): Promise<void> {
  await Notification.create({ userId, type, title, message, link });
}

export async function notifyMany(
  userIds: (Types.ObjectId | string)[],
  type: NotifType,
  title: string,
  message: string,
  link = '',
): Promise<void> {
  if (!userIds.length) return;
  await Notification.insertMany(userIds.map((userId) => ({ userId, type, title, message, link })));
}
