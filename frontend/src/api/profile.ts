import { apiClient } from './client';

export const profileApi = {
  update: (body: { firstName?: string; lastName?: string; email?: string }) =>
    apiClient.patch('/auth/profile', body).then((r) => r.data),
  updatePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiClient.patch('/auth/password', body).then((r) => r.data),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return apiClient.post('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  deleteAvatar: () => apiClient.delete('/auth/avatar').then((r) => r.data),
  avatarUrl: (bust?: number) => `/api/auth/avatar${bust ? `?t=${bust}` : ''}`,
};
