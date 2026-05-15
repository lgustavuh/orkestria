'use client';

import { useToast } from '@/hooks/useToast';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const colors = {
  success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg animate-fade-in ${colors[t.type]}`}>
            <Icon size={16} className="flex-shrink-0" />
            <p className="text-sm flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="p-0.5 rounded hover:opacity-70"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
