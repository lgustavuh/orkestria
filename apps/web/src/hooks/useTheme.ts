import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: typeof window !== 'undefined'
    ? (localStorage.getItem('orkestria-theme') as Theme) || 'light'
    : 'light',

  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('orkestria-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    set({ theme: next });
  },
}));
