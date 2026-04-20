import { apiClient } from './client';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  clientName: string;
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  currentPhase: string;
  startDate: string;
  targetEndDate?: string;
  members: { userId: { _id: string; firstName: string; lastName: string; email: string }; role: string; addedAt: string }[];
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  clientName: string;
  startDate: string;
  description?: string;
  targetEndDate?: string;
  tags?: string[];
}

export const projectsApi = {
  list:   ()                              => apiClient.get<{ data: Project[] }>('/projects').then(r => r.data.data),
  get:    (id: string)                    => apiClient.get<{ data: Project }>(`/projects/${id}`).then(r => r.data.data),
  create: (dto: CreateProjectDto)         => apiClient.post<{ data: Project }>('/projects', dto).then(r => r.data.data),
  update: (id: string, dto: Partial<CreateProjectDto> & { status?: string; currentPhase?: string }) =>
    apiClient.patch<{ data: Project }>(`/projects/${id}`, dto).then(r => r.data.data),
  addMember: (id: string, userId: string, role: string) =>
    apiClient.post<{ data: Project }>(`/projects/${id}/members`, { userId, role }).then(r => r.data.data),
};
