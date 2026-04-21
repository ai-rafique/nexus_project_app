import { apiClient } from './client';

export type FatResult = 'pending'|'pass'|'fail'|'blocked';

export interface FatItem {
  _id: string; order: number; title: string; description: string;
  linkedReq?: { _id: string; reqId: string; title: string } | string;
  result: FatResult; observations: string;
  signedOff: boolean; signedBy?: any; signedAt?: string;
}

export interface FatPlan {
  _id: string; projectId: string; title: string;
  status: 'draft'|'in_progress'|'completed';
  items: FatItem[];
  createdAt: string; updatedAt: string;
}

export interface FatReport {
  planId: string; title: string; status: string;
  summary: { total: number; passed: number; failed: number; blocked: number; pending: number; signedOff: number };
  passRate: number;
  punchList: FatItem[];
  generatedAt: string;
}

export const fatApi = {
  list: (projectId: string) =>
    apiClient.get<FatPlan[]>(`/projects/${projectId}/fat`).then(r => r.data),
  create: (projectId: string, body: { title: string; items?: Partial<FatItem>[] }) =>
    apiClient.post<FatPlan>(`/projects/${projectId}/fat`, body).then(r => r.data),
  get: (projectId: string, planId: string) =>
    apiClient.get<FatPlan>(`/projects/${projectId}/fat/${planId}`).then(r => r.data),
  addItem: (projectId: string, planId: string, body: { title: string; description?: string; linkedReq?: string }) =>
    apiClient.post<FatItem>(`/projects/${projectId}/fat/${planId}/items`, body).then(r => r.data),
  updateItem: (projectId: string, planId: string, itemId: string, body: { result?: FatResult; observations?: string }) =>
    apiClient.patch<FatItem>(`/projects/${projectId}/fat/${planId}/items/${itemId}`, body).then(r => r.data),
  signItem: (projectId: string, planId: string, itemId: string) =>
    apiClient.post<FatItem>(`/projects/${projectId}/fat/${planId}/items/${itemId}/sign`).then(r => r.data),
  report: (projectId: string, planId: string) =>
    apiClient.get<FatReport>(`/projects/${projectId}/fat/${planId}/report`).then(r => r.data),
};
