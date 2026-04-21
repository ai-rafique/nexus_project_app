import { useEffect, useState } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeToast, type ToastData } from '@/lib/toast';

export function Toaster() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    return subscribeToast((t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((p) => p.id !== t.id)), 4000);
    });
  }, []);

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open
          className={cn(
            'flex items-start justify-between gap-3 rounded-lg border p-4 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 slide-in-from-bottom-2',
            t.variant === 'destructive'
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border bg-white text-foreground',
          )}
        >
          <div className="flex-1 min-w-0">
            <ToastPrimitive.Title className="text-sm font-semibold">{t.title}</ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-xs opacity-80 mt-0.5">{t.description}</ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="opacity-60 hover:opacity-100 shrink-0">
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px]" />
    </ToastPrimitive.Provider>
  );
}
