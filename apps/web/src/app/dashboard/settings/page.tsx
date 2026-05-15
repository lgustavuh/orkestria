'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { Sun, Moon, Camera, Download } from 'lucide-react';
import { AvatarEditor } from '@/components/ui/avatar-editor';
import { Avatar } from '@/components/ui/avatar';


export default function SettingsPage() {
  const { user, loadUser } = useAuth();
  const { theme, toggle } = useTheme();
  const { show } = useToast();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.fetch('/users/me', { method: 'PATCH', body: JSON.stringify(profile) });
      show('Perfil atualizado');
      loadUser();
    } catch (err: any) { show(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (password.length < 8) { show('Mínimo 8 caracteres', 'error'); return; }
    setSaving(true);
    try {
      await api.fetch('/users/me/password', { method: 'PATCH', body: JSON.stringify({ password }) });
      show('Senha alterada');
      setPassword('');
    } catch (err: any) { show(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleAvatarSave = async (blob: Blob) => {
    try {
      // Convert blob to base64 and save directly in the database
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await api.fetch('/users/me', { method: 'PATCH', body: JSON.stringify({ avatarUrl: base64 }) });
        show('Avatar atualizado');
        setAvatarFile(null);
        loadUser();
      };
      reader.readAsDataURL(blob);
    } catch { show('Erro ao salvar avatar', 'error'); }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/reports/tasks/csv`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `orkestria-tarefas-${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
      show('CSV exportado');
    } catch { show('Erro ao exportar', 'error'); }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">Configurações</h2>

      {/* Avatar editor */}
      {avatarFile ? (
        <div className="card mb-4">
          <h3 className="font-medium mb-4 dark:text-white">Ajustar Avatar</h3>
          <AvatarEditor file={avatarFile} onSave={handleAvatarSave} onCancel={() => setAvatarFile(null)} />
        </div>
      ) : (
        <div className="card mb-4">
          <h3 className="font-medium mb-4 dark:text-white">Perfil</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xl font-semibold text-indigo-700 dark:text-indigo-300 overflow-hidden">
                {user?.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>}
              </div>
              <button onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) setAvatarFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
            <div>
              <p className="font-medium dark:text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              <span className="badge bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 mt-1">{user?.roles?.[0]}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nome</label>
              <input className="input" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sobrenome</label>
              <input className="input" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleSaveProfile} className="btn-primary text-sm" disabled={saving}>Salvar perfil</button>
        </div>
      )}

      {/* Theme */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div><h3 className="font-medium dark:text-white">Aparência</h3><p className="text-xs text-gray-400 mt-0.5">{theme === 'light' ? 'Tema claro' : 'Tema escuro'}</p></div>
          <button onClick={toggle} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm dark:text-gray-200 transition-colors">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-yellow-400" />}
            {theme === 'light' ? 'Escuro' : 'Claro'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card mb-4">
        <h3 className="font-medium mb-3 dark:text-white">Alterar Senha</h3>
        <div className="flex gap-2">
          <input type="password" className="input flex-1" placeholder="Nova senha (mín. 8)" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={handleChangePassword} className="btn-primary text-sm" disabled={saving}>Alterar</button>
        </div>
      </div>

      {/* Export */}
      <div className="card">
        <h3 className="font-medium mb-3 dark:text-white">Exportar Dados</h3>
        <button onClick={handleExportData} className="btn-secondary text-sm"><Download size={14} className="mr-2" /> Exportar tarefas (CSV)</button>
      </div>
    </div>
  );
}
