import { create } from 'zustand';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }

interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: Toast['type']) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500);
  },
  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
