'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isClient } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (isClient()) { router.push('/portal'); }
      else {
        try {
          const me = await api.getMe();
          if (me.roles?.includes('SUPER_ADMIN')) router.push('/superadmin');
          else router.push('/dashboard');
        } catch { router.push('/dashboard'); }
      }
    } catch (err: any) {
      const msg = err.message || 'Email ou senha incorretos';
      setError(msg);
      show(msg, 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#2A3F4E' }}>
      <div className="w-full max-w-sm" style={{ background: 'var(--bg-card)', borderRadius: '18px', padding: '36px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        <div className="text-center mb-8">
          <img src="/logo-icon.svg" alt="Orkestria" className="w-11 h-11 mx-auto" style={{ borderRadius: '12px' }} />
          <h1 className="text-xl font-medium mt-3 tracking-tight" style={{ color: 'var(--fg)' }}>Orkestria</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--fg-hint)' }}>Gerencie seus projetos de marketing</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="block text-[11px] mb-1.5" style={{ color: 'var(--fg-muted)' }}>Email</label>
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div className="mb-5">
            <label className="block text-[11px] mb-1.5" style={{ color: 'var(--fg-muted)' }}>Senha</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && (
            <div className="mb-3 p-2.5 text-[12px] text-center" style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '10px' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full text-[13px]" style={{ padding: '11px' }}>{loading ? 'Entrando...' : 'Entrar'}</button>
          <p className="text-center mt-4 text-[11px]" style={{ color: '#4B7B9C' }}>Esqueci minha senha</p>
        </form>
      </div>
    </div>
  );
}
