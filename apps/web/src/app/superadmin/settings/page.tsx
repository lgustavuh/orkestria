'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { Camera, Save, Lock } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const { user, loadUser } = useAuth();
  const { show } = useToast();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: (user as any)?.phone || '',
  });
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.fetch('/users/me', { method: 'PATCH', body: JSON.stringify(form) });
      show('Dados atualizados');
      loadUser();
    } catch (err: any) { show(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.fetch('/users/me', { method: 'PATCH', body: JSON.stringify({ avatarUrl: reader.result }) });
        show('Foto atualizada');
        loadUser();
      } catch (err: any) { show(err.message, 'error'); }
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async () => {
    if (pwForm.password !== pwForm.confirm) { show('Senhas não conferem', 'error'); return; }
    if (pwForm.password.length < 8) { show('Mínimo 8 caracteres', 'error'); return; }
    try {
      await api.fetch('/users/me/password', { method: 'PATCH', body: JSON.stringify({ password: pwForm.password }) });
      show('Senha alterada');
      setPwForm({ password: '', confirm: '' });
    } catch (err: any) { show(err.message, 'error'); }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-medium tracking-tight mb-1" style={{ color: 'var(--fg)' }}>Configurações</h1>
      <p className="text-[12px] mb-6" style={{ color: 'var(--fg-hint)' }}>Dados da conta Super Admin</p>

      <div className="flex gap-4 mb-6" style={{ borderBottom: '0.5px solid var(--border)' }}>
        {(['profile', 'password'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="pb-2 text-[13px]"
            style={{ color: tab === t ? 'var(--fg)' : 'var(--fg-hint)', fontWeight: tab === t ? 500 : 400, borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent' }}>
            {t === 'profile' ? 'Meus dados' : 'Senha'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar src={user?.avatarUrl} firstName={user?.firstName} lastName={user?.lastName} size="lg" />
              <label className="absolute -bottom-1 -right-1 w-7 h-7 flex items-center justify-center cursor-pointer" style={{ background: 'var(--brand)', borderRadius: '8px', color: 'white' }}>
                <Camera size={13} />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{user?.firstName} {user?.lastName}</p>
              <p className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Nome</label>
              <input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Sobrenome</label>
              <input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Telefone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2 text-[12px]">
            <Save size={13} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}

      {tab === 'password' && (
        <div className="max-w-sm">
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Nova senha</label>
              <input type="password" className="input" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Confirmar</label>
              <input type="password" className="input" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleChangePassword} disabled={!pwForm.password} className="btn-primary flex items-center gap-2 text-[12px]">
            <Lock size={13} /> Alterar senha
          </button>
        </div>
      )}
    </div>
  );
}
