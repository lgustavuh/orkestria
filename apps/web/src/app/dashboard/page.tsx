'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { FolderKanban, CheckSquare, ThumbsUp, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tenantStatus, setTenantStatus] = useState<any>(null);
  const [period, setPeriod] = useState('30');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState({ from: '', to: '' });

  useEffect(() => {
    api.fetch<any>('/reports/dashboard').then(setStats).catch(() => {});
    api.getProjects({ limit: '6' }).then((r: any) => setProjects(r.data || [])).catch(() => {});
    api.getNotifications({ limit: '5' }).then((r: any) => setNotifications(r.data || [])).catch(() => {});
    api.fetch<any>('/tenants/my-status').then(setTenantStatus).catch(() => {});
  }, []);

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const totalTasks = stats ? Object.values(stats.tasksByStatus || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0;
  const doneTasks = stats?.tasksByStatus?.DONE || 0;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const circumference = 2 * Math.PI * 50;
  const strokeDash = (pct / 100) * circumference;

  const metrics = [
    { label: 'Projetos ativos', value: stats?.activeProjects ?? '-', icon: FolderKanban, iconBg: '#EBF3F7', iconColor: '#4B7B9C', color: '#2A3F4E' },
    { label: 'Tarefas concluídas', value: doneTasks || '-', icon: CheckSquare, iconBg: '#ecfdf5', iconColor: '#059669', color: '#059669' },
    { label: 'Aprovações', value: stats?.pendingApprovals ?? '-', icon: ThumbsUp, iconBg: '#fef3e2', iconColor: '#d97706', color: '#d97706' },
    { label: 'Tarefas atrasadas', value: stats?.tasksByStatus?.BLOCKED || 0, icon: AlertCircle, iconBg: '#fee2e2', iconColor: '#dc2626', color: '#dc2626' },
  ];

  return (
    <div>
      {/* Trial banner */}
      {tenantStatus?.isTrial && tenantStatus?.daysLeft !== null && (hasRole('ADMIN') || hasRole('STRATEGIST')) && (
        <div className="flex items-center justify-between p-3 mb-4" style={{ background: tenantStatus.daysLeft <= 3 ? '#fef3e2' : 'var(--brand-light)', borderRadius: 'var(--radius)' }}>
          <p className="text-[12px]" style={{ color: tenantStatus.daysLeft <= 3 ? '#92400e' : 'var(--brand-text)' }}>
            {tenantStatus.daysLeft > 0
              ? `Seu teste gratuito termina em ${tenantStatus.daysLeft} dia${tenantStatus.daysLeft > 1 ? 's' : ''}.`
              : 'Seu teste gratuito expirou.'}
          </p>
          <a href="/subscribe" className="text-[11px] font-medium px-3 py-1" style={{ background: 'var(--brand)', color: 'white', borderRadius: '8px' }}>
            Assinar agora
          </a>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium tracking-tight" style={{ color: 'var(--fg)' }}>Dashboard</h1>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e => { setPeriod(e.target.value); if (e.target.value !== 'custom') setShowDatePicker(false); else setShowDatePicker(true); }}
            className="text-[11px] px-3 py-1.5 appearance-none cursor-pointer"
            style={{ background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--fg-hint)', border: '0.5px solid var(--border)' }}>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="180">Últimos 6 meses</option>
            <option value="365">Último ano</option>
            <option value="custom">Personalizado</option>
          </select>
          {showDatePicker && (
            <div className="flex items-center gap-1">
              <input type="date" className="text-[11px] px-2 py-1.5" value={customDate.from} onChange={e => setCustomDate(d => ({ ...d, from: e.target.value }))}
                style={{ background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--fg-muted)', border: '0.5px solid var(--border)' }} />
              <span className="text-[10px]" style={{ color: 'var(--fg-hint)' }}>a</span>
              <input type="date" className="text-[11px] px-2 py-1.5" value={customDate.to} onChange={e => setCustomDate(d => ({ ...d, to: e.target.value }))}
                style={{ background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--fg-muted)', border: '0.5px solid var(--border)' }} />
            </div>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metrics.map((m, i) => (
          <div key={i} className="flex gap-3 items-start p-4" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: m.iconBg, borderRadius: '10px' }}>
              <m.icon size={16} color={m.iconColor} strokeWidth={2} />
            </div>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{m.label}</div>
              <div className="text-2xl font-medium tracking-tight" style={{ color: m.color, letterSpacing: '-0.5px' }}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Project table */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Resumo de projetos</h2>
            <Link href="/dashboard/projects" className="text-[11px]" style={{ color: 'var(--brand)' }}>Ver todos</Link>
          </div>
          <div style={{ borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-hint)', fontWeight: 400 }}>Nome</td>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-hint)', fontWeight: 400 }}>Cliente</td>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-hint)', fontWeight: 400 }}>Status</td>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-hint)', fontWeight: 400 }}>Progresso</td>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 5).map((p: any) => (
                  <tr key={p.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <Link href={`/dashboard/projects/${p.id}`} className="font-medium hover:underline" style={{ color: 'var(--fg)' }}>{p.name}</Link>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-muted)' }}>{p.client?.name || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge" style={{
                        background: p.status === 'ACTIVE' ? '#ecfdf5' : p.status === 'COMPLETED' ? '#EBF3F7' : '#fef3e2',
                        color: p.status === 'ACTIVE' ? '#059669' : p.status === 'COMPLETED' ? '#4B7B9C' : '#d97706',
                      }}>{p.status === 'ACTIVE' ? 'ativo' : p.status === 'COMPLETED' ? 'concluído' : p.status?.toLowerCase()}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-[5px] overflow-hidden" style={{ background: 'var(--border)', borderRadius: '3px' }}>
                          <div style={{ width: `${p.progress || 0}%`, height: '100%', background: (p.progress || 0) >= 80 ? '#10b981' : 'var(--brand)', borderRadius: '3px' }} />
                        </div>
                        <span className="text-[10px] w-7 text-right" style={{ color: 'var(--fg-hint)' }}>{p.progress || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--fg-hint)' }}>Nenhum projeto</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Donut + Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--fg)' }}>Progresso geral</h2>
            <div className="text-center p-5" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <svg viewBox="0 0 120 120" width="110" height="110" style={{ margin: '0 auto' }}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--brand)" strokeWidth="10"
                  strokeDasharray={`${strokeDash} ${circumference}`} strokeDashoffset="0" strokeLinecap="round"
                  transform="rotate(-90 60 60)" />
                <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="500" fill="var(--fg)">{pct}%</text>
                <text x="60" y="72" textAnchor="middle" fontSize="10" fill="var(--fg-hint)">concluído</text>
              </svg>
              <div className="flex justify-center gap-4 mt-3 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                <span><span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: 'var(--brand)' }}></span>Feitas {doneTasks}</span>
                <span><span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: 'var(--border)' }}></span>Total {totalTasks}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--fg)' }}>Atividade recente</h2>
            <div className="space-y-3">
              {notifications.slice(0, 4).map((n: any) => (
                <div key={n.id} className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 flex items-center justify-center text-[9px] font-medium flex-shrink-0 mt-0.5"
                    style={{ borderRadius: '7px', background: 'var(--brand-light)', color: 'var(--brand-text)' }}>
                    {n.title?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] truncate" style={{ color: 'var(--fg)' }}>{n.title}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--fg-hint)' }}>{n.message}</p>
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--fg-hint)' }}>{timeAgo(n.createdAt)}</span>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>Sem atividade</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
