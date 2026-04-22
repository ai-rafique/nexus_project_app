import { apiClient } from './client';

export interface Settings {
  _id: string;
  companyName: string;
  hasLogo: boolean;
  logoMimeType?: string;
  updatedAt: string;
}

export const settingsApi = {
  get: () => apiClient.get<Settings>('/settings').then((r) => r.data),
  update: (body: { companyName?: string }) =>
    apiClient.patch<Settings>('/settings', body).then((r) => r.data),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return apiClient.post('/settings/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  deleteLogo: () => apiClient.delete('/settings/logo').then((r) => r.data),
  logoUrl: (bust?: number) => `/api/settings/logo${bust ? `?t=${bust}` : ''}`,
};
