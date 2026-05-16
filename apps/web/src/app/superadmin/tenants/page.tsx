'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  TRIAL: { bg: '#fef3e2', color: '#92400e', label: 'Trial' },
  ACTIVE: { bg: '#ecfdf5', color: '#059669', label: 'Ativo' },
  SUSPENDED: { bg: '#fee2e2', color: '#dc2626', label: 'Suspenso' },
  CANCELLED: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelado' },
};

const PLAN_STYLE: Record<string, { bg: string; color: string }> = {
  STARTER: { bg: '#e0f2fe', color: '#0369a1' },
  PRO: { bg: '#f0eeff', color: '#7c6ef0' },
  AGENCY: { bg: '#fce7f3', color: '#db2777' },
};

export default function TenantsListPage() {
  const { show } = useToast();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);
  const load = () => { api.fetch<any[]>('/tenants').then(setTenants).catch(() => {}).finally(() => setLoading(false)); };

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.fetch(`/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      show(`Status alterado para ${status}`);
      load();
    } catch (err: any) { show(err.message, 'error'); }
  };

  const changePlan = async (id: string, plan: string) => {
    try {
      await api.fetch(`/tenants/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ plan }) });
      show(`Plano alterado para ${plan}`);
      load();
    } catch (err: any) { show(err.message, 'error'); }
  };

  const filtered = tenants.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.ownerEmail.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase())
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ color: 'var(--fg)' }}>Agências</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--fg-hint)' }}>{tenants.length} agência{tenants.length !== 1 ? 's' : ''} cadastrada{tenants.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'var(--bg-secondary)', borderRadius: '10px', border: '0.5px solid var(--border)' }}>
          <Search size={13} style={{ color: 'var(--fg-hint)' }} />
          <input className="bg-transparent text-[12px] outline-none w-48" placeholder="Buscar agência..." value={search} onChange={e => setSearch(e.target.value)} style={{ color: 'var(--fg)' }} />
        </div>
      </div>

      <div style={{ borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Agência</td>
              <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Plano</td>
              <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Status</td>
              <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Usuários</td>
              <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Projetos</td>
              <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Cadastro</td>
              <td style={{ padding: '10px 14px', color: 'var(--fg-hint)', textAlign: 'right' }}>Ações</td>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const s = STATUS_STYLE[t.status] || STATUS_STYLE.TRIAL;
              const p = PLAN_STYLE[t.plan] || PLAN_STYLE.STARTER;
              return (
                <tr key={t.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <Link href={`/superadmin/tenants/${t.id}`} className="hover:underline">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--fg)' }}>{t.name}</span>
                    </Link>
                    <p className="text-[10px]" style={{ color: 'var(--fg-hint)' }}>{t.ownerEmail}</p>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select value={t.plan} onChange={e => changePlan(t.id, e.target.value)}
                      className="text-[10px] px-2 py-0.5 cursor-pointer" style={{ background: p.bg, color: p.color, borderRadius: '6px', border: 'none' }}>
                      <option value="STARTER">Starter</option>
                      <option value="PRO">Pro</option>
                      <option value="AGENCY">Agência</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select value={t.status} onChange={e => changeStatus(t.id, e.target.value)}
                      className="text-[10px] px-2 py-0.5 cursor-pointer" style={{ background: s.bg, color: s.color, borderRadius: '6px', border: 'none' }}>
                      <option value="TRIAL">Trial</option>
                      <option value="ACTIVE">Ativo</option>
                      <option value="SUSPENDED">Suspenso</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-muted)' }}>{t._count?.users || 0}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-muted)' }}>{t._count?.projects || 0}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-muted)' }}>{formatDate(t.createdAt)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <Link href={`/superadmin/tenants/${t.id}`} className="p-1.5 inline-flex" style={{ color: 'var(--brand)', borderRadius: '7px' }}>
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-[12px]" style={{ color: 'var(--fg-hint)' }}>Nenhuma agência encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
