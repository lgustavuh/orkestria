'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Building2, Users, FolderKanban, DollarSign, TrendingUp, Clock, XCircle, CheckCircle } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetch<any>('/tenants/saas-metrics').then(setMetrics).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }} /></div>;

  const cards = [
    { label: 'Total de agências', value: metrics?.totalTenants ?? 0, icon: Building2, iconBg: '#f0eeff', iconColor: '#7c6ef0', color: '#2d2a3e' },
    { label: 'Agências ativas', value: metrics?.activeTenants ?? 0, icon: CheckCircle, iconBg: '#ecfdf5', iconColor: '#059669', color: '#059669' },
    { label: 'Em trial', value: metrics?.trialTenants ?? 0, icon: Clock, iconBg: '#fef3e2', iconColor: '#d97706', color: '#d97706' },
    { label: 'Suspensas', value: metrics?.suspendedTenants ?? 0, icon: XCircle, iconBg: '#fee2e2', iconColor: '#dc2626', color: '#dc2626' },
    { label: 'MRR (receita mensal)', value: `R$ ${(metrics?.mrr ?? 0).toLocaleString('pt-BR')}`, icon: DollarSign, iconBg: '#ecfdf5', iconColor: '#059669', color: '#059669' },
    { label: 'Novos (30 dias)', value: metrics?.recentSignups ?? 0, icon: TrendingUp, iconBg: '#f0eeff', iconColor: '#7c6ef0', color: '#7c6ef0' },
    { label: 'Total de usuários', value: metrics?.totalUsers ?? 0, icon: Users, iconBg: '#e0f2fe', iconColor: '#0284c7', color: '#0284c7' },
    { label: 'Total de projetos', value: metrics?.totalProjects ?? 0, icon: FolderKanban, iconBg: '#fce7f3', iconColor: '#db2777', color: '#db2777' },
  ];

  return (
    <div>
      <h1 className="text-xl font-medium tracking-tight mb-1" style={{ color: 'var(--fg)' }}>Painel do SaaS</h1>
      <p className="text-[12px] mb-6" style={{ color: 'var(--fg-hint)' }}>Visão geral de todas as agências</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((m, i) => (
          <div key={i} className="flex gap-3 items-start p-4" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: m.iconBg, borderRadius: '10px' }}>
              <m.icon size={16} color={m.iconColor} strokeWidth={2} />
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{m.label}</div>
              <div className="text-xl font-medium tracking-tight" style={{ color: m.color }}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
