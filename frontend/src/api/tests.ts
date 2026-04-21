import { apiClient } from './client';

export interface TestStep { order: number; action: string; expected: string; }
export interface TestRun  { _id: string; result: 'pass'|'fail'|'blocked'|'na'; notes: string; executedBy: any; executedAt: string; }

export interface TestCase {
  _id: string; projectId: string; testId: string;
  title: string; description: string;
  steps: TestStep[];
  linkedReqs: { _id: string; reqId: string; title: string }[];
  status: 'draft'|'active'|'deprecated';
  runs: TestRun[];
  createdAt: string; updatedAt: string;
}

export const testsApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    apiClient.get<TestCase[]>(`/projects/${projectId}/tests`, { params }).then(r => r.data),
  get: (projectId: string, testId: string) =>
    apiClient.get<TestCase>(`/projects/${projectId}/tests/${testId}`).then(r => r.data),
  create: (projectId: string, body: Partial<TestCase>) =>
    apiClient.post<TestCase>(`/projects/${projectId}/tests`, body).then(r => r.data),
  update: (projectId: string, testId: string, body: Partial<TestCase>) =>
    apiClient.patch<TestCase>(`/projects/${projectId}/tests/${testId}`, body).then(r => r.data),
  delete: (projectId: string, testId: string) =>
    apiClient.delete(`/projects/${projectId}/tests/${testId}`).then(r => r.data),
  addRun: (projectId: string, testId: string, body: { result: string; notes?: string }) =>
    apiClient.post<TestRun>(`/projects/${projectId}/tests/${testId}/runs`, body).then(r => r.data),
  getRuns: (projectId: string, testId: string) =>
    apiClient.get<TestRun[]>(`/projects/${projectId}/tests/${testId}/runs`).then(r => r.data),
};
