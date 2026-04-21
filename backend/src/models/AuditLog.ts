import { Schema, model, Document as MongoDoc, Types } from 'mongoose';

export type AuditAction =
  | 'user.register' | 'user.login' | 'user.logout'
  | 'project.create' | 'project.update' | 'project.member_add'
  | 'requirement.create' | 'requirement.update' | 'requirement.delete'
  | 'document.create' | 'document.submit' | 'document.review' | 'document.approve' | 'document.delete'
  | 'tracelink.create' | 'tracelink.delete'
  | 'testcase.create' | 'testcase.update' | 'testcase.delete' | 'testrun.add'
  | 'fat.create' | 'fat.item_execute' | 'fat.item_sign'
  | 'verification.entry_add' | 'verification.entry_update'
  | 'settings.update' | 'settings.logo_upload';

export interface IAuditLog extends MongoDoc {
  _id:        Types.ObjectId;
  projectId?: Types.ObjectId;
  userId:     Types.ObjectId;
  action:     AuditAction;
  entityType: string;
  entityId?:  string;
  details:    Record<string, unknown>;
  ip?:        string;
  createdAt:  Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    projectId:  { type: Schema.Types.ObjectId, ref: 'Project' },
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action:     { type: String, required: true },
    entityType: { type: String, required: true },
    entityId:   { type: String },
    details:    { type: Schema.Types.Mixed, default: {} },
    ip:         { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ projectId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
