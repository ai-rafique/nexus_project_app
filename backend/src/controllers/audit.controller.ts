import type { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';

// GET /api/projects/:projectId/audit
export async function getProjectAudit(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const [logs, total] = await Promise.all([
      AuditLog.find({ projectId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('userId', 'firstName lastName email'),
      AuditLog.countDocuments({ projectId }),
    ]);

    return res.json({ data: logs, total, limit, offset });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/audit  (global — super_admin)
export async function getGlobalAudit(req: Request, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const { action, entityType } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .populate('projectId', 'name'),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({ data: logs, total, limit, offset });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
