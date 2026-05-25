'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ThumbsUp, Check, X, MessageSquare } from 'lucide-react';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN') || hasRole('STRATEGIST');

  useEffect(() => { load(); }, []);
  const load = () => api.fetch<any>('/approvals').then(setApprovals).catch(() => setApprovals({ data: [] }));

  const resolve = async (id: string, status: string, fb?: string) => {
    try {
      await api.fetch(`/approvals/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ status, feedback: fb }) });
      setFeedbackId(null); setFeedback('');
      load();
    } catch (err: any) { alert(err.message); }
  };

  const items = approvals?.data || approvals || [];

  const statusConfig: Record<string, { label: string; badge: string }> = {
    PENDING: { label: 'Pendente', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    APPROVED: { label: 'Aprovado pelo cliente', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
    REJECTED: { label: 'Reprovado pelo cliente', badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    CHANGES_REQUESTED: { label: 'Cliente solicitou ajustes', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">Aprovações</h2>
      {!approvals ? <p className="text-gray-400 text-sm">Carregando...</p> : items.length === 0 ? (
        <div className="card text-center py-12">
          <ThumbsUp size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-400 dark:text-gray-500">Nenhuma aprovação</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a: any) => {
            const cfg = statusConfig[a.status] || statusConfig.PENDING;
            return (
              <div key={a.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      <span className={`badge ${a.type === 'CLIENT' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                        {a.type === 'CLIENT' ? (a.task?.project?.client?.name || 'Cliente') : 'Interna'}
                      </span>
                    </div>
                    <p className="font-medium dark:text-white">{a.title}</p>
                    {a.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{a.description}</p>}
                    {a.feedback && <p className="text-sm text-[#3A6280] dark:text-[#6B9AB8] mt-2 italic">&ldquo;{a.feedback}&rdquo;</p>}
                  </div>

                  {/* Action buttons only for admin/strategist on PENDING approvals */}
                  {canManage && a.status === 'PENDING' && (
                    <div className="flex gap-1 flex-shrink-0 ml-4">
                      <button onClick={() => resolve(a.id, 'APPROVED')} className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" title="Aprovar">
                        <Check size={16} />
                      </button>
                      <button onClick={() => { setFeedbackId(a.id); setFeedback(''); }} className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40" title="Pedir ajustes">
                        <MessageSquare size={16} />
                      </button>
                      <button onClick={() => resolve(a.id, 'REJECTED')} className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40" title="Rejeitar">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {canManage && feedbackId === a.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                    <input className="input flex-1" placeholder="Descreva os ajustes..." value={feedback} onChange={e => setFeedback(e.target.value)} />
                    <button onClick={() => resolve(a.id, 'CHANGES_REQUESTED', feedback)} className="btn-primary text-sm">Enviar</button>
                    <button onClick={() => setFeedbackId(null)} className="btn-secondary text-sm">Cancelar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
