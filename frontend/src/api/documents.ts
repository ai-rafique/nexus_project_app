import { apiClient } from './client';

export interface DocSection {
  id: string;
  title: string;
  content: string;
  order: number;
  linkedReqs: string[];
}

export interface Reviewer {
  userId: { _id: string; name: string; email: string } | string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
  signedAt?: string;
}

export interface Document {
  _id: string;
  projectId: string;
  type: string;
  title: string;
  status: string;
  version: string;
  sections: DocSection[];
  reviewers: Reviewer[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const documentsApi = {
  list: (projectId: string) =>
    apiClient.get<Document[]>(`/projects/${projectId}/documents`).then((r) => r.data),

  get: (projectId: string, docId: string) =>
    apiClient.get<Document>(`/projects/${projectId}/documents/${docId}`).then((r) => r.data),

  create: (projectId: string, body: { type: string; title: string; version?: string }) =>
    apiClient.post<Document>(`/projects/${projectId}/documents`, body).then((r) => r.data),

  updateSection: (projectId: string, docId: string, sectionId: string, body: { content?: string; linkedReqs?: string[] }) =>
    apiClient.patch<Document>(`/projects/${projectId}/documents/${docId}/sections/${sectionId}`, body).then((r) => r.data),

  submit: (projectId: string, docId: string, reviewerIds: string[]) =>
    apiClient.post<Document>(`/projects/${projectId}/documents/${docId}/submit`, { reviewerIds }).then((r) => r.data),

  review: (projectId: string, docId: string, body: { status: 'approved' | 'rejected'; comment?: string }) =>
    apiClient.post<Document>(`/projects/${projectId}/documents/${docId}/review`, body).then((r) => r.data),

  approve: (projectId: string, docId: string) =>
    apiClient.post<Document>(`/projects/${projectId}/documents/${docId}/approve`).then((r) => r.data),

  pdfUrl: (projectId: string, docId: string) =>
    `/api/projects/${projectId}/documents/${docId}/pdf`,

  delete: (projectId: string, docId: string) =>
    apiClient.delete(`/projects/${projectId}/documents/${docId}`).then((r) => r.data),
};
