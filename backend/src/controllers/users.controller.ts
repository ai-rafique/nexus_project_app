import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// GET /api/users?search=&page=&limit=
export async function listUsers(req: Request, res: Response) {
  try {
    const { search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const query = search
      ? { $or: [
          { firstName: new RegExp(esc(search), 'i') },
          { lastName:  new RegExp(esc(search), 'i') },
          { email:     new RegExp(esc(search), 'i') },
        ]}
      : {};

    const [rawUsers, total] = await Promise.all([
      User.aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
        { $addFields: { hasAvatar: { $gt: ['$avatarData', null] } } },
        { $project: { passwordHash: 0, totpSecret: 0, avatarData: 0, avatarMimeType: 0 } },
      ]),
      User.countDocuments(query),
    ]);

    return res.json({ data: rawUsers, total });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/users/by-email?email= (any auth'd user — exact match only)
export async function findByEmail(req: Request, res: Response) {
  try {
    const email = String(req.query.email ?? '').toLowerCase().trim();
    if (!email) return res.status(400).json({ message: 'email query param required' });

    const user = await User.findOne({ email }).select('firstName lastName email _id globalRole');
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({ data: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, globalRole: user.globalRole } });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/users/:id (super_admin only)
const updateUserSchema = z.object({
  globalRole: z.enum(['super_admin', 'member']).optional(),
  isActive:   z.boolean().optional(),
});

export async function updateUser(req: Request, res: Response) {
  try {
    const body = updateUserSchema.parse(req.body);
    if (req.params.id === req.user!.sub) {
      return res.status(400).json({ message: 'Cannot modify your own account here' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...body },
      { new: true },
    ).select('firstName lastName email globalRole isActive isTotpEnabled createdAt');

    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ data: user });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/users/:id/avatar (public, serves avatar for any user)
export async function getUserAvatar(req: Request, res: Response) {
  try {
    const user = await User.findById(req.params.id).select('avatarData avatarMimeType');
    if (!user?.avatarData) return res.status(404).json({ message: 'No avatar set' });
    res.set('Content-Type', user.avatarMimeType ?? 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(user.avatarData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
