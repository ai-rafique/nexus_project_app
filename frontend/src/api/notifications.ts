import { apiClient } from './client';

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: () => apiClient.get<Notification[]>('/notifications').then((r) => r.data),
  unreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),
  markRead: (id: string) => apiClient.patch<Notification>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.patch('/notifications/read-all').then((r) => r.data),
};
