import { AuditLog, type AuditAction } from '../models/AuditLog';
import type { Types } from 'mongoose';

export async function audit(
  userId: string | Types.ObjectId,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  details: Record<string, unknown> = {},
  projectId?: string | Types.ObjectId,
  ip?: string,
): Promise<void> {
  try {
    await AuditLog.create({ userId, action, entityType, entityId, details, projectId, ip });
  } catch {
    // Audit failures must never break the main request
  }
}
