'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function ResponsiveLayout({ children, sidebar }: Props) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { if (isMobile) setOpen(false); }, [children]);

  return (
    <div className="min-h-screen flex relative">
      {isMobile && open && <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setOpen(false)} />}
      <div className={`${isMobile ? 'fixed top-0 left-0 h-full z-40 transition-transform duration-200' : 'relative'} ${isMobile && !open ? '-translate-x-full' : 'translate-x-0'}`}>
        {sidebar}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {isMobile && (
          <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center px-4 gap-3 sticky top-0 z-20">
            <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {open ? <X size={20} className="dark:text-gray-300" /> : <Menu size={20} className="dark:text-gray-300" />}
            </button>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">Orkestria</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
