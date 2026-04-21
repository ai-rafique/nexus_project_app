export type ToastData = {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

type Listener = (t: ToastData) => void;
const listeners: Listener[] = [];
let counter = 0;

function emit(data: Omit<ToastData, 'id'>) {
  const t: ToastData = { id: String(++counter), ...data };
  listeners.forEach((l) => l(t));
}

export function subscribeToast(l: Listener) {
  listeners.push(l);
  return () => {
    const i = listeners.indexOf(l);
    if (i > -1) listeners.splice(i, 1);
  };
}

export const toast = {
  success: (title: string, description?: string) => emit({ title, description }),
  error:   (title: string, description?: string) => emit({ title, description, variant: 'destructive' }),
};
