import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) => (
  <ToastPrimitive.Viewport
    className={cn('fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px]', className)}
    {...props}
  />
);

export function Toast({ className, variant = 'default', ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & { variant?: 'default' | 'destructive' }) {
  return (
    <ToastPrimitive.Root
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border p-4 shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80',
        variant === 'destructive' ? 'border-red-200 bg-red-50 text-red-900' : 'border bg-white text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export const ToastTitle = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) => (
  <ToastPrimitive.Title className={cn('text-sm font-semibold', className)} {...props} />
);

export const ToastDescription = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) => (
  <ToastPrimitive.Description className={cn('text-sm opacity-90', className)} {...props} />
);

export const ToastClose = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>) => (
  <ToastPrimitive.Close className={cn('opacity-70 hover:opacity-100', className)} {...props}>
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
);
