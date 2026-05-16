'use client';

import { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
    >
      {theme === 'light' ? <Moon size={18} className="text-gray-500" /> : <Sun size={18} className="text-yellow-400" />}
    </button>
  );
}
