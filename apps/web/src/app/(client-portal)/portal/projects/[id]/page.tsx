'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Users, Download, CheckCircle2, XCircle, MessageSquare, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';

export default function PortalProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'deliverables' | 'approvals'>('overview');

  useEffect(() => {
    api.portalGetProject(id).then(setProject);
    api.portalGetDeliverables(id).then(setDeliverables);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/portal/projects/${id}/timeline`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    }).then(r => r.json()).then(setTimeline);
  }, [id]);

  if (!project) return <div className="text-gray-400 py-12 text-center">Carregando...</div>;

  const activeStage = project.stages?.find((s: any) => s.isActive);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/portal" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{project.name}</h2>
          <p className="text-sm text-gray-400">{activeStage ? `Etapa atual: ${activeStage.name}` : ''}</p>
        </div>
        <span className={`badge text-sm ${
          project.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
        }`}>{project.status}</span>
      </div>

      {/* Progress */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Progresso do projeto</span>
          <span className="text-lg font-semibold">{project.progress}%</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
        </div>

        {/* Stage timeline */}
        <div className="flex gap-1 mt-4">
          {project.stages?.map((stage: any, i: number) => (
            <div key={i} className="flex-1">
              <div className={`h-2 rounded-full ${
                stage.isActive ? 'bg-indigo-500' :
                stage.completedAt ? 'bg-emerald-400' :
                'bg-gray-200'
              }`} />
              <p className={`text-[10px] text-center mt-1 ${
                stage.isActive ? 'text-indigo-600 font-semibold' :
                stage.completedAt ? 'text-emerald-600' :
                'text-gray-400'
              }`}>{stage.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'overview' as const, label: 'Visão geral' },
          { key: 'deliverables' as const, label: `Entregas (${deliverables.length})` },
          { key: 'approvals' as const, label: 'Aprovações' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Project info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Informações</h3>
              <div className="space-y-2 text-sm">
                {project.objective && <p><span className="text-gray-500">Objetivo:</span> {project.objective}</p>}
                {project.channels?.length > 0 && <p><span className="text-gray-500">Canais:</span> {project.channels.join(', ')}</p>}
                {project.startDate && <p><span className="text-gray-500">Início:</span> {new Date(project.startDate).toLocaleDateString('pt-BR')}</p>}
                {project.endDate && <p><span className="text-gray-500">Prazo:</span> {new Date(project.endDate).toLocaleDateString('pt-BR')}</p>}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Equipe responsável</h3>
              <div className="space-y-2">
                {project.members?.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Avatar src={m.user?.avatarUrl} firstName={m.user?.firstName} lastName={m.user?.lastName} size="sm" />
                    <div>
                      <p className="text-sm dark:text-gray-200">{m.user?.firstName} {m.user?.lastName}</p>
                      {m.roleInProject && <p className="text-xs text-gray-400">{m.roleInProject}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          {timeline && (
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Atividade recente</h3>
              <div className="space-y-3">
                {timeline.recentDeliverables?.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <FileText size={14} className="text-gray-400" />
                    <span>Entrega disponível: <strong>{f.originalName}</strong></span>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(f.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
                {timeline.approvals?.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${a.status === 'APPROVED' ? 'bg-emerald-400' : a.status === 'PENDING' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <span>Aprovação: <strong>{a.title}</strong> — {a.status === 'PENDING' ? 'Pendente' : a.status === 'APPROVED' ? 'Aprovada' : 'Rejeitada'}</span>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'deliverables' && (
        <div className="space-y-3">
          {deliverables.length === 0 ? (
            <div className="card text-center py-12 text-gray-400 text-sm">Nenhuma entrega disponível ainda</div>
          ) : (
            deliverables.map((f: any) => (
              <div key={f.id} className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <FileText size={20} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.originalName}</p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{(Number(f.sizeBytes) / 1048576).toFixed(1)} MB</span>
                    <span>v{f.version}</span>
                    <span>{f.uploadedBy?.firstName} {f.uploadedBy?.lastName}</span>
                    <span>{new Date(f.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {f.description && <p className="text-xs text-gray-500 mt-1">{f.description}</p>}
                </div>
                <button onClick={() => api.getDownloadUrl(f.id).then(r => window.open(r.downloadUrl))}
                  className="btn-secondary text-xs px-3 py-1.5">
                  <Download size={14} className="mr-1" /> Baixar
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'approvals' && (
        <PortalApprovals projectId={id} />
      )}
    </div>
  );
}

function PortalApprovals({ projectId }: { projectId: string }) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');
  const [activeModal, setActiveModal] = useState<{ id: string; action: string } | null>(null);

  const load = () => {
    api.portalGetApprovals({ projectId }).then(setApprovals);
  };

  useEffect(() => { load(); }, [projectId]);

  const resolve = async (approvalId: string, status: string) => {
    if (status === 'CHANGES_REQUESTED' || status === 'REJECTED') {
      setActiveModal({ id: approvalId, action: status });
      return;
    }
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portal/approvals/${approvalId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const submitFeedback = async () => {
    if (!activeModal) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portal/approvals/${activeModal.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: activeModal.action, feedback }),
    });
    setActiveModal(null);
    setFeedback('');
    load();
  };

  return (
    <div className="space-y-3">
      {approvals.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 text-sm">Nenhuma aprovação pendente</div>
      ) : (
        approvals.map((a: any) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex gap-2 mb-1">
                  <span className={`badge ${a.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : a.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {a.status === 'PENDING' ? 'Pendente' : a.status === 'APPROVED' ? 'Aprovado' : a.status === 'CHANGES_REQUESTED' ? 'Ajustes' : 'Rejeitado'}
                  </span>
                </div>
                <h4 className="font-medium">{a.title}</h4>
                <p className="text-xs text-gray-400 mt-1">Tarefa: {a.task?.title} · Por: {a.requestedBy?.firstName} {a.requestedBy?.lastName}</p>
              </div>
              {a.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => resolve(a.id, 'APPROVED')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-medium">
                    <CheckCircle2 size={14} /> Aprovar
                  </button>
                  <button onClick={() => resolve(a.id, 'CHANGES_REQUESTED')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs font-medium">
                    <MessageSquare size={14} /> Ajustes
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {activeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold mb-3">Descreva os ajustes necessários</h3>
            <textarea className="input" rows={4} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Descreva seu feedback..." autoFocus />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setActiveModal(null); setFeedback(''); }} className="btn-secondary">Cancelar</button>
              <button onClick={submitFeedback} className="btn-primary" disabled={!feedback.trim()}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
