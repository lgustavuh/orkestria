'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LogOut, Lock, X } from 'lucide-react';
import { api } from '@/lib/api';

const PORTAL_NAV = [
  { href: '/portal', label: 'Projetos' },
  { href: '/portal/approvals', label: 'Aprovações' },
  { href: '/portal/feedback', label: 'Feedback' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, loadUser, logout, isClient } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
    if (!isLoading && isAuthenticated && !isClient()) router.push('/dashboard');
  }, [isLoading, isAuthenticated]);

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) { show('Senhas não conferem', 'error'); return; }
    if (pwForm.newPassword.length < 6) { show('Mínimo 6 caracteres', 'error'); return; }
    setSaving(true);
    try {
      await api.fetch('/portal/profile/password', { method: 'PATCH', body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
      show('Senha alterada com sucesso');
      setShowPwModal(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { show(err.message || 'Senha atual incorreta', 'error'); }
    finally { setSaving(false); }
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="" style={{ background: 'var(--bg-sidebar)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo-icon.svg" alt="Orkestria" className="w-6 h-6" style={{ borderRadius: '7px' }} />
              <span className="text-[14px] font-medium" style={{ color: 'var(--fg-sidebar-active)' }}>Orkestria</span>
            </div>
            <nav className="flex gap-4">
              {PORTAL_NAV.map(item => {
                const active = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} className="text-[12px] pb-0.5 transition-colors"
                    style={{ color: active ? 'var(--fg-sidebar-active)' : 'var(--fg-sidebar)', fontWeight: active ? 500 : 400, borderBottom: active ? '1.5px solid var(--brand)' : '1.5px solid transparent' }}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2">
                <Avatar src={user?.avatarUrl} firstName={user?.firstName} lastName={user?.lastName} size="sm" />
                <span className="text-[12px] hidden sm:inline" style={{ color: 'var(--fg-sidebar)' }}>{user?.firstName}</span>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-10 w-44 py-1 z-20" style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '0.5px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                  <button onClick={() => { setShowMenu(false); setShowPwModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors hover:opacity-80" style={{ color: 'var(--fg-muted)' }}>
                    <Lock size={13} /> Alterar senha
                  </button>
                  <button onClick={() => { logout(); router.push('/login'); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors hover:opacity-80" style={{ color: '#dc2626' }}>
                    <LogOut size={13} /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">{children}</main>

      {/* Password modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowPwModal(false)}>
          <div className="w-full max-w-sm" style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-medium" style={{ color: 'var(--fg)' }}>Alterar senha</h3>
              <button onClick={() => setShowPwModal(false)} style={{ color: 'var(--fg-hint)' }}><X size={16} /></button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Senha atual</label>
                <input type="password" className="input" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Nova senha</label>
                <input type="password" className="input" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Confirmar nova senha</label>
                <input type="password" className="input" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleChangePassword} disabled={saving || !pwForm.currentPassword || !pwForm.newPassword} className="btn-primary flex-1 text-[12px]">
                {saving ? 'Salvando...' : 'Alterar senha'}
              </button>
              <button onClick={() => setShowPwModal(false)} className="btn-secondary text-[12px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
