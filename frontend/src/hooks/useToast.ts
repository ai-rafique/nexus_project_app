import { useState, useCallback } from 'react';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastQueue: ((item: ToastItem) => void) | null = null;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...item, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  toastQueue = toast;

  return { toasts, toast, dismiss: (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)) };
}

export function toast(item: Omit<ToastItem, 'id'>) {
  toastQueue?.(item);
}
