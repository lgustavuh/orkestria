'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit, Users, X, Shield, RotateCcw, Key } from 'lucide-react';

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '');
  if (!d) return '+';
  if (d.startsWith('55') || d.length <= 2) {
    const br = d.startsWith('55') ? d.slice(0,13) : ('55'+d).slice(0,13);
    if (br.length <= 2) return `+${br}`;
    if (br.length <= 4) return `+${br.slice(0,2)} ${br.slice(2)}`;
    if (br.length <= 9) return `+${br.slice(0,2)} ${br.slice(2,4)} ${br.slice(4)}`;
    return `+${br.slice(0,2)} ${br.slice(2,4)} ${br.slice(4,9)}-${br.slice(9)}`;
  }
  if (d.startsWith('351')) {
    const n = d.slice(0,12);
    if (n.length <= 3) return `+${n}`;
    if (n.length <= 6) return `+${n.slice(0,3)} ${n.slice(3)}`;
    if (n.length <= 9) return `+${n.slice(0,3)} ${n.slice(3,6)} ${n.slice(6)}`;
    return `+${n.slice(0,3)} ${n.slice(3,6)} ${n.slice(6,9)} ${n.slice(9)}`;
  }
  const n = d.slice(0,15);
  if (n.length <= 3) return `+${n}`;
  if (n.length <= 7) return `+${n.slice(0,3)} ${n.slice(3)}`;
  return `+${n.slice(0,3)} ${n.slice(3,7)} ${n.slice(7)}`;
}

const ROLES = [
  { id: 'role-admin', name: 'ADMIN', label: 'Admin' },
  { id: 'role-strategist', name: 'STRATEGIST', label: 'Estrategista' },
  { id: 'role-copywriter', name: 'COPYWRITER', label: 'Copywriter' },
  { id: 'role-traffic', name: 'TRAFFIC_MANAGER', label: 'Gestor de Tráfego' },
  { id: 'role-social', name: 'SOCIAL_MEDIA', label: 'Social Media' },
  { id: 'role-designer', name: 'DESIGNER', label: 'Designer' },
  { id: 'role-client', name: 'CLIENT', label: 'Cliente' },
];

const roleBadge = (r: string) => ({
  ADMIN: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  STRATEGIST: 'bg-[#D6E7EF] dark:bg-[#1E2F3A]/30 text-[#2A3F4E] dark:text-[#6B9AB8]',
  CLIENT: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
}[r] || 'bg-purple-100 dark:bg-purple-900/30 text-[#2A3F4E] dark:text-purple-400');

const roleLabel = (r: string) => ROLES.find(x => x.name === r)?.label || r;

interface UserForm {
  firstName: string; lastName: string; email: string; phone: string; password: string; roleId: string;
}

const emptyForm: UserForm = { firstName: '', lastName: '', email: '', phone: '', password: '', roleId: 'role-strategist' };

export default function AdminPage() {
  const [users, setUsers] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>({ ...emptyForm });
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');
  const { hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!hasRole('ADMIN') && !hasRole('STRATEGIST')) { router.push('/dashboard'); return; }
    load();
  }, []);

  const load = () => api.fetch<any>('/users').then(setUsers).catch(() => {});

  const closeForm = () => { setShowForm(false); setEditId(null); setForm({ ...emptyForm }); };

  const handleSave = async () => {
    if (!form.firstName || !form.email) { alert('Nome e email são obrigatórios'); return; }
    try {
      if (editId) {
        await api.fetch(`/users/${editId}`, { method: 'PATCH', body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined, email: form.email,
        }) });
      } else {
        if (!form.password || form.password.length < 8) { alert('Senha deve ter no mínimo 8 caracteres'); return; }
        await api.fetch('/users', { method: 'POST', body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName, email: form.email,
          phone: form.phone || undefined, password: form.password, roleId: form.roleId,
        }) });
      }
      closeForm();
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleEdit = (u: any) => {
    setForm({
      firstName: u.firstName, lastName: u.lastName, email: u.email,
      phone: u.phone || '', password: '', roleId: u.roleDetails?.[0]?.id || 'role-strategist',
    });
    setEditId(u.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o usuário "${name}"? O email será anonimizado.`)) return;
    try { await api.fetch(`/users/${id}`, { method: 'DELETE' }); load(); } catch (err: any) { alert(err.message); }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.fetch(`/users/${id}/${isActive ? 'activate' : ''}`, {
        method: isActive ? 'PATCH' : 'DELETE',
      });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleResetPassword = async () => {
    if (!resetPwId || newPw.length < 8) { alert('Mínimo 8 caracteres'); return; }
    try {
      await api.fetch(`/users/${resetPwId}/password`, { method: 'PATCH', body: JSON.stringify({ password: newPw }) });
      setResetPwId(null);
      setNewPw('');
      alert('Senha resetada com sucesso');
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold dark:text-white">Administração de Usuários</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }); }} className="btn-primary">
          <Plus size={16} className="mr-2" /> Novo Usuário
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium dark:text-white">{editId ? 'Editar' : 'Novo'} Usuário</h3>
            <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sobrenome</label>
                <input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))} placeholder="+55 35 99999-9999" />
              </div>
            </div>
            {!editId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha *</label>
                  <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mín. 8 caracteres" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perfil</label>
                  <select className="input" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="btn-primary">{editId ? 'Salvar' : 'Criar usuário'}</button>
              <button onClick={closeForm} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetPwId && (
        <div className="card mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2"><Key size={16} /> Resetar senha</h3>
            <button onClick={() => { setResetPwId(null); setNewPw(''); }} className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/20"><X size={16} className="text-amber-400" /></button>
          </div>
          <div className="flex gap-2">
            <input type="password" className="input flex-1" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nova senha (mín. 8 caracteres)" />
            <button onClick={handleResetPassword} className="btn-primary">Resetar</button>
          </div>
        </div>
      )}

      {/* Users table */}
      {!users ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Usuário</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Perfil</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 w-32 text-right font-medium text-gray-500 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(users.data || users).map((u: any) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#D6E7EF] dark:bg-[#1E2F3A] flex items-center justify-center text-xs font-medium text-[#2A3F4E] dark:text-[#7BABC2]">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <span className="font-medium dark:text-gray-100">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.roleDetails?.[0]?.id || ''}
                      onChange={async (e) => {
                        const newRoleId = e.target.value;
                        const oldRoleId = u.roleDetails?.[0]?.id;
                        try {
                          if (oldRoleId) {
                            await api.fetch(`/users/${u.id}/roles`, { method: 'DELETE', body: JSON.stringify({ roleId: oldRoleId }) });
                          }
                          await api.fetch(`/users/${u.id}/roles`, { method: 'POST', body: JSON.stringify({ roleId: newRoleId }) });
                          load();
                        } catch (err: any) { alert(err.message); }
                      }}
                      className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 dark:text-gray-200 focus:ring-1 focus:ring-[#4B7B9C]"
                    >
                      {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.isActive !== false
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {u.isActive !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => handleEdit(u)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Editar">
                        <Edit size={14} className="text-gray-400" />
                      </button>
                      <button onClick={() => { setResetPwId(u.id); setNewPw(''); }} className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Resetar senha">
                        <Key size={14} className="text-amber-500" />
                      </button>
                      {u.isActive === false ? (
                        <button onClick={() => handleToggleActive(u.id, true)} className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Reativar">
                          <RotateCcw size={14} className="text-emerald-500" />
                        </button>
                      ) : (
                        <button onClick={() => handleDelete(u.id, `${u.firstName} ${u.lastName}`)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Excluir">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
