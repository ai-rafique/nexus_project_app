import { apiClient } from './client';

export interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: 'super_admin' | 'member';
  isActive: boolean;
  hasAvatar: boolean;
  isTotpEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
}

export const usersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: AdminUser[]; total: number }>('/users', { params }).then((r) => r.data),
  findByEmail: (email: string) =>
    apiClient.get<{ data: { _id: string; firstName: string; lastName: string; email: string; globalRole: string } }>('/users/by-email', { params: { email } }).then((r) => r.data.data),
  update: (id: string, body: { globalRole?: 'super_admin' | 'member'; isActive?: boolean }) =>
    apiClient.patch<{ data: AdminUser }>(`/users/${id}`, body).then((r) => r.data.data),
  avatarUrl: (id: string, bust?: number) => `/api/users/${id}/avatar${bust ? `?t=${bust}` : ''}`,
};
