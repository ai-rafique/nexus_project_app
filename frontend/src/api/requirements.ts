import { apiClient } from './client';

export interface Requirement {
  _id: string;
  projectId: string;
  reqId: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  type: 'functional' | 'non_functional' | 'constraint' | 'interface';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'under_review' | 'approved' | 'deprecated';
  source: string;
  tags: string[];
  assignedTo?: { _id: string; firstName: string; lastName: string };
  version: number;
  comments: { _id: string; userId: { _id: string; firstName: string; lastName: string }; text: string; createdAt: string }[];
  createdBy: { _id: string; firstName: string; lastName: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequirementDto {
  title: string;
  description?: string;
  acceptanceCriteria?: string;
  type?: Requirement['type'];
  priority?: Requirement['priority'];
  status?: Requirement['status'];
  source?: string;
  tags?: string[];
}

export const requirementsApi = {
  list: (projectId: string, filters?: Record<string, string>) =>
    apiClient.get<{ data: Requirement[] }>(`/projects/${projectId}/requirements`, { params: filters }).then(r => r.data.data),
  get: (projectId: string, reqId: string) =>
    apiClient.get<{ data: Requirement }>(`/projects/${projectId}/requirements/${reqId}`).then(r => r.data.data),
  create: (projectId: string, dto: CreateRequirementDto) =>
    apiClient.post<{ data: Requirement }>(`/projects/${projectId}/requirements`, dto).then(r => r.data.data),
  update: (projectId: string, reqId: string, dto: Partial<CreateRequirementDto>) =>
    apiClient.patch<{ data: Requirement }>(`/projects/${projectId}/requirements/${reqId}`, dto).then(r => r.data.data),
  delete: (projectId: string, reqId: string) =>
    apiClient.delete(`/projects/${projectId}/requirements/${reqId}`),
  addComment: (projectId: string, reqId: string, text: string) =>
    apiClient.post(`/projects/${projectId}/requirements/${reqId}/comments`, { text }),
  import: (projectId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ data: Requirement[]; imported: number }>(`/projects/${projectId}/requirements/import`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
