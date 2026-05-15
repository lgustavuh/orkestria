'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { GlobalSearch } from '@/components/ui/global-search';
import { NotificationBell } from '@/components/ui/notification-bell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ToastContainer } from '@/components/ui/toast-container';
import { Avatar } from '@/components/ui/avatar';
import { ResponsiveLayout } from '@/components/layout/responsive-layout';
import {
  LayoutDashboard, FolderKanban, CheckSquare, FileText,
  ThumbsUp, Zap, Users, Settings, LogOut, Building2, CalendarDays, Activity, Layers, HardDrive
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/dashboard/tasks', label: 'Minhas tarefas', icon: CheckSquare },
  { href: '/dashboard/calendar', label: 'Calendário', icon: CalendarDays },
  { href: '/dashboard/files', label: 'Arquivos', icon: FileText },
  { href: '/dashboard/approvals', label: 'Aprovações', icon: ThumbsUp },
  { href: '/dashboard/activity', label: 'Atividade', icon: Activity },
  { href: '/dashboard/automations', label: 'Automações', icon: Layers, roles: ['ADMIN', 'STRATEGIST'] },
  { href: '/dashboard/clients', label: 'Clientes', icon: Building2, roles: ['ADMIN', 'STRATEGIST'] },
  { href: '/dashboard/backup', label: 'Backup', icon: HardDrive, roles: ['ADMIN', 'STRATEGIST'] },
  { href: '/dashboard/admin', label: 'Administração', icon: Users, roles: ['ADMIN', 'STRATEGIST'] },
];

function Sidebar() {
  const { user, hasRole, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const visibleNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.some((r) => hasRole(r)));

  const isActive = (href: string) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <aside className="w-52 flex flex-col h-full" style={{ background: 'var(--bg-sidebar)', borderRadius: '18px 0 0 18px' }}>
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo-icon.svg" alt="Orkestria" className="w-7 h-7" style={{ borderRadius: '8px' }} />
          <span className="text-[14px] font-medium tracking-tight" style={{ color: 'var(--fg-sidebar-active)' }}>Orkestria</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2.5 px-3 py-[7px] text-[12px] transition-all"
              style={{
                borderRadius: '10px',
                background: active ? 'var(--bg-sidebar-active)' : 'transparent',
                color: active ? 'var(--fg-sidebar-active)' : 'var(--fg-sidebar)',
                fontWeight: active ? 500 : 400,
              }}>
              <item.icon size={15} strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2" style={{ borderTop: '1px solid var(--bg-sidebar-hover)' }}>
        <div className="flex items-center gap-2.5 p-2.5" style={{ background: 'var(--bg-sidebar-hover)', borderRadius: '10px' }}>
          <Avatar src={user?.avatarUrl} firstName={user?.firstName} lastName={user?.lastName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium truncate" style={{ color: 'var(--fg-sidebar-active)' }}>{user?.firstName} {user?.lastName}</p>
            <p className="text-[9px] truncate" style={{ color: 'var(--brand)' }}>{user?.roles?.[0]}</p>
          </div>
        </div>
        <div className="flex gap-1 mt-1">
          <Link href="/dashboard/settings" className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] transition-colors"
            style={{ color: 'var(--fg-sidebar)', borderRadius: '8px' }}>
            <Settings size={11} /> Config
          </Link>
          <button onClick={() => { logout(); router.push('/login'); }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] transition-colors hover:text-red-400"
            style={{ color: 'var(--fg-sidebar)', borderRadius: '8px' }}>
            <LogOut size={11} /> Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, loadUser, isClient, hasRole } = useAuth();
  const router = useRouter();

  const [tenantOk, setTenantOk] = useState(true);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
    if (!isLoading && isAuthenticated && hasRole('SUPER_ADMIN') && !hasRole('STRATEGIST')) router.push('/superadmin');
    if (!isLoading && isAuthenticated && isClient()) router.push('/portal');
    if (!isLoading && isAuthenticated && !isClient()) {
      api.fetch<any>('/tenants/my-status').then(status => {
        if (status.isSuspended) {
          router.push('/subscribe');
          setTenantOk(false);
        }
      }).catch(() => {});
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }} />
          <span className="text-sm" style={{ color: 'var(--fg-hint)' }}>Carregando...</span>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <ResponsiveLayout sidebar={<Sidebar />}>
      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-card)', borderRadius: '0 18px 18px 0' }}>
        <header className="h-14 items-center justify-between px-6 hidden md:flex" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <GlobalSearch />
          <div className="flex items-center gap-2"><ThemeToggle /><NotificationBell /></div>
        </header>
        <div className="md:hidden flex items-center justify-between px-4 py-2" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex-1 mr-2"><GlobalSearch /></div>
          <div className="flex items-center gap-1"><ThemeToggle /><NotificationBell /></div>
        </div>
        <div className="p-4 md:p-6 flex-1">
          <Breadcrumbs />
          {children}
        </div>
      </div>
      <ToastContainer />
    </ResponsiveLayout>
  );
}
