'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Building2, Settings, LogOut, Shield, Database } from 'lucide-react';

const NAV = [
  { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/superadmin/tenants', label: 'Agências', icon: Building2 },
  { href: '/superadmin/settings', label: 'Configurações', icon: Settings },
  { href: '/superadmin/backup', label: 'Backup', icon: Database },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, loadUser, hasRole, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
    if (!isLoading && isAuthenticated && !hasRole('SUPER_ADMIN')) router.push('/dashboard');
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside className="w-52 flex flex-col h-screen sticky top-0" style={{ background: '#1E2F3A' }}>
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center" style={{ background: '#ef4444', borderRadius: '8px' }}>
              <Shield size={14} color="white" />
            </div>
            <span className="text-[14px] font-medium" style={{ color: '#E0EBF0' }}>Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-1 space-y-0.5">
          {NAV.map(item => {
            const active = item.href === '/superadmin' ? pathname === '/superadmin' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-2.5 px-3 py-[7px] text-[12px] transition-all"
                style={{ borderRadius: '10px', background: active ? '#2d2640' : 'transparent', color: active ? '#e8e6f0' : '#7c7891', fontWeight: active ? 500 : 400 }}>
                <item.icon size={15} strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-2" style={{ borderTop: '1px solid #354D5E' }}>
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-1.5 text-[11px]" style={{ color: '#8DA4B4', borderRadius: '8px' }}>
            <Settings size={12} /> Ir ao Dashboard
          </Link>
          <button onClick={() => { logout(); router.push('/login'); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:text-red-400" style={{ color: '#8DA4B4', borderRadius: '8px' }}>
            <LogOut size={12} /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 p-6" style={{ background: 'var(--bg-card)' }}>
        {children}
      </div>
    </div>
  );
}
