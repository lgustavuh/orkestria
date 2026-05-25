'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateBR } from '@/lib/date';
import { ThumbsUp, Check, X, MessageSquare, FileText, Download, Clock } from 'lucide-react';

export default function PortalApprovalsPage() {
  const [approvals, setApprovals] = useState<any>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  const load = () => api.portalGetApprovals().then((data: any) => {
    setApprovals(data);
    const items = data?.data || data || [];
    items.forEach((a: any) => {
      (a.task?.files || []).forEach((f: any) => {
        if (f.mimeType?.startsWith('image/') && !previews[f.id]) {
          api.fetch<any>(`/portal/files/${f.id}/download`).then(r => setPreviews(p => ({ ...p, [f.id]: r.downloadUrl }))).catch(() => {});
        }
      });
    });
  }).catch(() => setApprovals([]));

  const resolve = async (id: string, status: string, fb?: string) => {
    try {
      await api.fetch(`/portal/approvals/${id}`, { method: 'PATCH', body: JSON.stringify({ status, feedback: fb }) });
      setFeedbackId(null); setFeedback('');
      load();
    } catch (err: any) { alert(err.message); }
  };

  const items = approvals?.data || approvals || [];
  const isImg = (mime: string) => mime?.startsWith('image/');

  const statusConfig: Record<string, { label: string; badge: string }> = {
    PENDING: { label: 'Pendente', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    APPROVED: { label: 'Aprovado', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
    REJECTED: { label: 'Reprovado', badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    CHANGES_REQUESTED: { label: 'Ajustes solicitados', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
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
        <div className="space-y-4">
          {items.map((a: any) => {
            const cfg = statusConfig[a.status] || statusConfig.PENDING;
            const isPending = a.status === 'PENDING';
            const taskFiles = a.task?.files || [];
            const lastComment = a.task?.comments?.[0];

            return (
              <div key={a.id} className="card">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                  {a.createdAt && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{formatDateBR(a.createdAt)}</span>}
                </div>

                {/* Project name */}
                {a.task?.project?.name && (
                  <p className="text-xs text-[#3A6280] dark:text-[#6B9AB8] font-medium mb-1">Projeto: {a.task.project.name}</p>
                )}

                {/* Task title as main heading */}
                <h3 className="text-lg font-semibold dark:text-white mb-1">{a.task?.title || a.title}</h3>

                {/* Last comment from author (the message sent with the approval) */}
                {lastComment && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Mensagem de {lastComment.user?.firstName} {lastComment.user?.lastName}:
                    </p>
                    <p className="text-sm dark:text-gray-200">{lastComment.content}</p>
                  </div>
                )}

                {/* Task description if no comment */}
                {!lastComment && a.task?.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{a.task.description}</p>
                )}

                {/* Files */}
                {taskFiles.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Arquivos ({taskFiles.length}):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {taskFiles.map((f: any) => (
                        <button key={f.id} onClick={async () => {
                          try { const r = await api.fetch<any>(`/portal/files/${f.id}/download`); window.open(r.downloadUrl, '_blank'); } catch {}
                        }} className="rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#7BABC2] dark:hover:border-[#2A3F4E] hover:shadow-md transition-all overflow-hidden text-left group">
                          <div className="h-24 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden relative">
                            {isImg(f.mimeType) && previews[f.id] ? (
                              <img src={previews[f.id]} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl">{isImg(f.mimeType) ? '🖼️' : f.mimeType?.includes('pdf') ? '📄' : '📎'}</span>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <Download size={16} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" />
                            </div>
                          </div>
                          <div className="p-1.5">
                            <p className="text-[10px] font-medium truncate dark:text-gray-200">{f.originalName || f.fileName}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback if already resolved */}
                {a.feedback && (
                  <div className="bg-[#EBF3F7] dark:bg-[#1E2F3A]/10 rounded-lg p-3 mb-3">
                    <p className="text-xs text-[#3A6280] dark:text-[#6B9AB8] mb-1">Seu feedback:</p>
                    <p className="text-sm text-[#2A3F4E] dark:text-[#7BABC2]">{a.feedback}</p>
                  </div>
                )}

                {/* Actions */}
                {isPending && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    {feedbackId === a.id ? (
                      <div className="flex gap-2">
                        <input className="input flex-1 text-sm" placeholder="Descreva os ajustes necessários..." value={feedback} onChange={e => setFeedback(e.target.value)} />
                        <button onClick={() => resolve(a.id, 'CHANGES_REQUESTED', feedback)} className="btn-primary text-sm">Enviar</button>
                        <button onClick={() => setFeedbackId(null)} className="btn-secondary text-sm">Cancelar</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => resolve(a.id, 'APPROVED')} className="btn-primary text-sm flex items-center gap-1"><Check size={14} /> Aprovar</button>
                        <button onClick={() => { setFeedbackId(a.id); setFeedback(''); }} className="btn-secondary text-sm flex items-center gap-1"><MessageSquare size={14} /> Pedir ajustes</button>
                        <button onClick={() => resolve(a.id, 'REJECTED')} className="btn-danger text-sm flex items-center gap-1"><X size={14} /> Rejeitar</button>
                      </div>
                    )}
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
