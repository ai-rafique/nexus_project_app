import type { Request, Response } from 'express';
import { Notification } from '../models/Notification';

// GET /api/notifications
export async function listNotifications(req: Request, res: Response) {
  try {
    const userId = req.user!.sub;
    const notifs = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(notifs);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/notifications/unread-count
export async function unreadCount(req: Request, res: Response) {
  try {
    const count = await Notification.countDocuments({ userId: req.user!.sub, read: false });
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/notifications/:id/read
export async function markRead(req: Request, res: Response) {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.sub },
      { read: true },
      { new: true },
    );
    if (!notif) return res.status(404).json({ message: 'Not found' });
    return res.json(notif);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/notifications/read-all
export async function markAllRead(req: Request, res: Response) {
  try {
    await Notification.updateMany({ userId: req.user!.sub, read: false }, { read: true });
    return res.json({ message: 'All marked as read' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
