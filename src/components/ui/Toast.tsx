import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove],
  );

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className={cn(
                'pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-card glass-strong border',
                t.type === 'success' && 'border-emerald-400/40',
                t.type === 'error' && 'border-rose-400/40',
                t.type === 'info' && 'border-brand-400/40',
              )}
            >
              <span
                className={cn(
                  'grid place-items-center rounded-full p-1',
                  t.type === 'success' && 'text-emerald-600',
                  t.type === 'error' && 'text-rose-600',
                  t.type === 'info' && 'text-brand-400',
                )}
              >
                {t.type === 'success' && <CheckCircle2 size={22} />}
                {t.type === 'error' && <XCircle size={22} />}
                {t.type === 'info' && <Info size={22} />}
              </span>
              <span className="text-sm font-medium text-ink-primary">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                className="text-ink-muted hover:text-ink-primary transition-colors"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
