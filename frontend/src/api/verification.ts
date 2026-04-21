import { apiClient } from './client';

export type VerifMethod = 'test' | 'review' | 'analysis' | 'demonstration';
export type VerifStatus = 'planned' | 'in_progress' | 'verified' | 'failed';

export interface VerifEntry {
  _id: string;
  requirementId: { _id: string; reqId: string; title: string } | string;
  method: VerifMethod;
  reference: string;
  status: VerifStatus;
  notes: string;
  verifiedBy?: { _id: string; firstName: string; lastName: string } | null;
  verifiedAt?: string;
}

export interface VerificationMatrix {
  _id: string;
  projectId: string;
  entries: VerifEntry[];
}

export interface VerifSummary {
  totalRequirements: number;
  coveredRequirements: number;
  totalEntries: number;
  verified: number;
  failed: number;
  planned: number;
  inProgress: number;
  verificationRate: number;
}

export const verificationApi = {
  getMatrix: (projectId: string) =>
    apiClient.get<VerificationMatrix>(`/projects/${projectId}/verification`).then((r) => r.data),

  getSummary: (projectId: string) =>
    apiClient.get<VerifSummary>(`/projects/${projectId}/verification/summary`).then((r) => r.data),

  autoPopulate: (projectId: string) =>
    apiClient.post<VerificationMatrix>(`/projects/${projectId}/verification/auto-populate`).then((r) => r.data),

  addEntry: (projectId: string, body: { requirementId: string; method: VerifMethod; reference?: string; status?: VerifStatus; notes?: string }) =>
    apiClient.post<VerificationMatrix>(`/projects/${projectId}/verification/entries`, body).then((r) => r.data),

  updateEntry: (projectId: string, entryId: string, body: Partial<{ status: VerifStatus; reference: string; notes: string }>) =>
    apiClient.patch<VerificationMatrix>(`/projects/${projectId}/verification/entries/${entryId}`, body).then((r) => r.data),

  deleteEntry: (projectId: string, entryId: string) =>
    apiClient.delete(`/projects/${projectId}/verification/entries/${entryId}`).then((r) => r.data),
};
