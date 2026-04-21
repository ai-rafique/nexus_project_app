import { apiClient } from './client';

export interface AuditLog {
  _id: string;
  userId: { _id: string; firstName: string; lastName: string; email: string } | string;
  projectId?: { _id: string; name: string } | string | null;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface AuditPage {
  data: AuditLog[];
  total: number;
}

export const auditApi = {
  getProjectAudit: (projectId: string, params?: { limit?: number; offset?: number }) =>
    apiClient.get<AuditPage>(`/projects/${projectId}/audit`, { params }).then((r) => r.data),

  getGlobalAudit: (params?: { limit?: number; offset?: number; action?: string; entityType?: string }) =>
    apiClient.get<AuditPage>('/audit', { params }).then((r) => r.data),
};
