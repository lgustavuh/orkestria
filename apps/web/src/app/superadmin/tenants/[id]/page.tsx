'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Save, Trash2, Key, Pencil, X, Check } from 'lucide-react';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  TRIAL: { bg: '#fef3e2', color: '#92400e' },
  ACTIVE: { bg: '#ecfdf5', color: '#059669' },
  SUSPENDED: { bg: '#fee2e2', color: '#dc2626' },
  CANCELLED: { bg: '#f3f4f6', color: '#6b7280' },
};

export default function TenantDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { show } = useToast();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTenant, setEditingTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', ownerEmail: '', maxUsers: 3, maxProjects: 5, maxStorageMB: 2048 });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [resetPwUser, setResetPwUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = () => {
    api.fetch<any>(`/tenants/${id}/details`).then(t => {
      setTenant(t);
      setTenantForm({ name: t.name, ownerEmail: t.ownerEmail, maxUsers: t.maxUsers, maxProjects: t.maxProjects, maxStorageMB: t.maxStorageMB });
    }).catch(() => {}).finally(() => setLoading(false));
  };

  const saveTenantData = async () => {
    setSaving(true);
    try {
      await api.fetch(`/tenants/${id}/update-data`, { method: 'PATCH', body: JSON.stringify(tenantForm) });
      show('Dados atualizados'); setEditingTenant(false); load();
    } catch (err: any) { show(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (status: string) => {
    try { await api.fetch(`/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); show('Status alterado'); load(); } catch (err: any) { show(err.message, 'error'); }
  };

  const changePlan = async (plan: string) => {
    try { await api.fetch(`/tenants/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ plan }) }); show('Plano alterado'); load(); } catch (err: any) { show(err.message, 'error'); }
  };

  const startEditUser = (u: any) => {
    setEditingUser(u.id);
    setUserForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone || '' });
  };

  const saveUser = async (userId: string) => {
    try {
      await api.fetch(`/tenants/users/${userId}`, { method: 'PATCH', body: JSON.stringify(userForm) });
      show('Usuário atualizado'); setEditingUser(null); load();
    } catch (err: any) { show(err.message, 'error'); }
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      await api.fetch(`/tenants/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ isActive: !isActive }) });
      show(isActive ? 'Usuário desativado' : 'Usuário ativado'); load();
    } catch (err: any) { show(err.message, 'error'); }
  };

  const resetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 8) { show('Mínimo 8 caracteres', 'error'); return; }
    try {
      await api.fetch(`/tenants/users/${userId}/reset-password`, { method: 'PATCH', body: JSON.stringify({ password: newPassword }) });
      show('Senha resetada'); setResetPwUser(null); setNewPassword('');
    } catch (err: any) { show(err.message, 'error'); }
  };

  const deleteTenant = async () => {
    if (!confirm(`Cancelar "${tenant.name}"? Todos os usuários serão desativados.`)) return;
    if (!confirm('Certeza absoluta?')) return;
    try { await api.fetch(`/tenants/${id}`, { method: 'DELETE' }); show('Agência cancelada'); router.push('/superadmin/tenants'); } catch (err: any) { show(err.message, 'error'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }} /></div>;
  if (!tenant) return <p style={{ color: 'var(--fg-hint)' }}>Não encontrado</p>;

  const s = STATUS_STYLE[tenant.status] || STATUS_STYLE.TRIAL;

  return (
    <div>
      <button onClick={() => router.push('/superadmin/tenants')} className="flex items-center gap-1 text-[12px] mb-4" style={{ color: 'var(--fg-hint)' }}>
        <ArrowLeft size={14} /> Voltar
      </button>

      {/* Header with controls */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ color: 'var(--fg)' }}>{tenant.name}</h1>
          <p className="text-[12px]" style={{ color: 'var(--fg-hint)' }}>{tenant.slug} · {tenant.ownerEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditingTenant(true)} className="flex items-center gap-1 px-3 py-1.5 text-[11px]" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--fg-muted)', border: '0.5px solid var(--border)' }}>
            <Pencil size={11} /> Editar dados
          </button>
          <select value={tenant.plan} onChange={e => changePlan(e.target.value)} className="text-[11px] px-3 py-1.5 cursor-pointer" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '0.5px solid var(--border)', color: 'var(--fg)' }}>
            <option value="STARTER">Starter</option><option value="PRO">Pro</option><option value="AGENCY">Agência</option>
          </select>
          <select value={tenant.status} onChange={e => changeStatus(e.target.value)} className="text-[11px] px-3 py-1.5 cursor-pointer" style={{ background: s.bg, borderRadius: '8px', border: 'none', color: s.color }}>
            <option value="TRIAL">Trial</option><option value="ACTIVE">Ativo</option><option value="SUSPENDED">Suspenso</option><option value="CANCELLED">Cancelado</option>
          </select>
          <button onClick={deleteTenant} className="p-1.5 hover:text-red-500" style={{ color: 'var(--fg-hint)' }} title="Cancelar"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Edit tenant modal */}
      {editingTenant && (
        <div className="card mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-medium" style={{ color: 'var(--fg)' }}>Editar dados da agência</h3>
            <button onClick={() => setEditingTenant(false)} style={{ color: 'var(--fg-hint)' }}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Nome da agência</label>
              <input className="input" value={tenantForm.name} onChange={e => setTenantForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Email do proprietário</label>
              <input className="input" value={tenantForm.ownerEmail} onChange={e => setTenantForm(f => ({ ...f, ownerEmail: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Limite de usuários</label>
              <input type="number" className="input" value={tenantForm.maxUsers} onChange={e => setTenantForm(f => ({ ...f, maxUsers: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Limite de projetos</label>
              <input type="number" className="input" value={tenantForm.maxProjects} onChange={e => setTenantForm(f => ({ ...f, maxProjects: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Armazenamento (MB)</label>
              <input type="number" className="input" value={tenantForm.maxStorageMB} onChange={e => setTenantForm(f => ({ ...f, maxStorageMB: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveTenantData} disabled={saving} className="btn-primary text-[12px] flex items-center gap-1"><Save size={12} /> {saving ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => setEditingTenant(false)} className="btn-secondary text-[12px]">Cancelar</button>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <div className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>Usuários</div>
          <div className="text-lg font-medium" style={{ color: 'var(--fg)' }}>{tenant._count?.users || 0} <span className="text-[11px] font-normal" style={{ color: 'var(--fg-hint)' }}>/ {tenant.maxUsers}</span></div>
        </div>
        <div className="p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <div className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>Projetos</div>
          <div className="text-lg font-medium" style={{ color: 'var(--fg)' }}>{tenant._count?.projects || 0} <span className="text-[11px] font-normal" style={{ color: 'var(--fg-hint)' }}>/ {tenant.maxProjects}</span></div>
        </div>
        <div className="p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <div className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>Clientes</div>
          <div className="text-lg font-medium" style={{ color: 'var(--fg)' }}>{tenant._count?.clients || 0}</div>
        </div>
        <div className="p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <div className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>Cadastro</div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--fg)' }}>{formatDate(tenant.createdAt)}</div>
        </div>
      </div>

      {/* Trial / Asaas info */}
      {tenant.trialEndsAt && (
        <div className="p-3 mb-6 flex items-center gap-2" style={{ background: '#fef3e2', borderRadius: 'var(--radius)' }}>
          <span className="text-[12px]" style={{ color: '#92400e' }}>Trial até {formatDate(tenant.trialEndsAt)}</span>
          {tenant.asaasCustomerId && <span className="text-[10px] ml-auto px-2 py-0.5" style={{ background: '#ecfdf5', color: '#059669', borderRadius: '6px' }}>Asaas: {tenant.asaasCustomerId}</span>}
        </div>
      )}

      {/* Users table with inline editing */}
      <h2 className="text-[14px] font-medium mb-3" style={{ color: 'var(--fg)' }}>Usuários ({tenant.users?.length || 0})</h2>
      <div style={{ borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', overflow: 'hidden' }} className="mb-6">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>Nome</td>
              <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>Email</td>
              <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>Perfis</td>
              <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>Status</td>
              <td style={{ padding: '8px 14px', color: 'var(--fg-hint)', textAlign: 'right' }}>Ações</td>
            </tr>
          </thead>
          <tbody>
            {tenant.users?.map((u: any) => (
              <tr key={u.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                {editingUser === u.id ? (
                  <>
                    <td style={{ padding: '6px 10px' }}>
                      <div className="flex gap-1">
                        <input className="input text-[11px] py-1" value={userForm.firstName} onChange={e => setUserForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Nome" />
                        <input className="input text-[11px] py-1" value={userForm.lastName} onChange={e => setUserForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Sobrenome" />
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input className="input text-[11px] py-1" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {u.roles?.map((r: any) => <span key={r.role.name} className="text-[9px] px-1.5 py-0.5 mr-1" style={{ background: 'var(--bg-secondary)', borderRadius: '4px', color: 'var(--fg-muted)' }}>{r.role.name}</span>)}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span className="text-[10px] px-2 py-0.5" style={{ background: u.isActive ? '#ecfdf5' : '#fee2e2', color: u.isActive ? '#059669' : '#dc2626', borderRadius: '6px' }}>{u.isActive ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => saveUser(u.id)} className="p-1" style={{ color: '#059669' }}><Check size={13} /></button>
                        <button onClick={() => setEditingUser(null)} className="p-1" style={{ color: 'var(--fg-hint)' }}><X size={13} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '8px 14px', color: 'var(--fg)' }}>{u.firstName} {u.lastName}</td>
                    <td style={{ padding: '8px 14px', color: 'var(--fg-muted)' }}>{u.email}</td>
                    <td style={{ padding: '8px 14px' }}>
                      {u.roles?.map((r: any) => <span key={r.role.name} className="text-[9px] px-1.5 py-0.5 mr-1" style={{ background: 'var(--bg-secondary)', borderRadius: '4px', color: 'var(--fg-muted)' }}>{r.role.name}</span>)}
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <button onClick={() => toggleUserActive(u.id, u.isActive)} className="text-[10px] px-2 py-0.5 cursor-pointer" style={{ background: u.isActive ? '#ecfdf5' : '#fee2e2', color: u.isActive ? '#059669' : '#dc2626', borderRadius: '6px', border: 'none' }}>
                        {u.isActive ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEditUser(u)} className="p-1" style={{ color: 'var(--fg-hint)' }} title="Editar"><Pencil size={12} /></button>
                        <button onClick={() => { setResetPwUser(u.id); setNewPassword(''); }} className="p-1" style={{ color: '#d97706' }} title="Resetar senha"><Key size={12} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset password modal */}
      {resetPwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setResetPwUser(null)}>
          <div className="w-full max-w-sm" style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-medium" style={{ color: 'var(--fg)' }}>Resetar senha</h3>
              <button onClick={() => setResetPwUser(null)} style={{ color: 'var(--fg-hint)' }}><X size={16} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Nova senha</label>
              <input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => resetPassword(resetPwUser)} className="btn-primary flex-1 text-[12px]">Resetar</button>
              <button onClick={() => setResetPwUser(null)} className="btn-secondary text-[12px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Projects */}
      {tenant.projects?.length > 0 && (
        <>
          <h2 className="text-[14px] font-medium mb-3" style={{ color: 'var(--fg)' }}>Projetos ({tenant.projects.length})</h2>
          <div style={{ borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>Projeto</td>
                  <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>Status</td>
                  <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>Progresso</td>
                  <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>Criado em</td>
                </tr>
              </thead>
              <tbody>
                {tenant.projects.map((p: any) => (
                  <tr key={p.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '8px 14px', color: 'var(--fg)' }}>{p.name}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span className="text-[10px] px-2 py-0.5" style={{ background: p.status === 'ACTIVE' ? '#ecfdf5' : 'var(--bg-secondary)', color: p.status === 'ACTIVE' ? '#059669' : 'var(--fg-muted)', borderRadius: '6px' }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-[4px] overflow-hidden" style={{ background: 'var(--border)', borderRadius: '2px', maxWidth: '80px' }}>
                          <div style={{ width: `${p.progress || 0}%`, height: '100%', background: 'var(--brand)', borderRadius: '2px' }} />
                        </div>
                        <span className="text-[10px]" style={{ color: 'var(--fg-hint)' }}>{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--fg-hint)' }}>{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
