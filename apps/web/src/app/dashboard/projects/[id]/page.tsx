'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateBR } from '@/lib/date';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, X, CheckSquare, UserPlus, UserMinus } from 'lucide-react';
import { KanbanBoard } from '@/components/ui/kanban-board';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';

type Tab = 'overview' | 'tasks' | 'files' | 'approvals' | 'feedback';

const STATUS_BADGE: Record<string, string> = {
  TODO: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  IN_PROGRESS: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
  IN_REVIEW: 'bg-[#D6E7EF] dark:bg-[#1E2F3A]/30 text-[#2A3F4E] dark:text-[#6B9AB8]',
  BLOCKED: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
  DONE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'text-gray-400', MEDIUM: 'text-sky-500', HIGH: 'text-amber-500', URGENT: 'text-rose-500',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const canManage = hasRole('ADMIN') || hasRole('STRATEGIST');
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
  const [creating, setCreating] = useState(false);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [projectApprovals, setProjectApprovals] = useState<any[]>([]);
  const [projectFeedback, setProjectFeedback] = useState<any[]>([]);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [showAddMember, setShowAddMember] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  useEffect(() => {
    api.getProject(id).then(setProject).catch(() => {});
    loadTasks();
    api.fetch<any>(`/files?projectId=${id}`).then((r: any) => {
      const items = r.data || [];
      setProjectFiles(items);
      items.forEach((f: any) => {
        if (f.mimeType?.startsWith('image/') && !filePreviews[f.id]) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
          const token = api.getAccessToken();
          fetch(apiUrl + '/files/' + f.id + '/download', { headers: token ? { Authorization: 'Bearer ' + token } : {} })
            .then(r => r.blob())
            .then(b => setFilePreviews(p => ({ ...p, [f.id]: URL.createObjectURL(b) })))
            .catch(() => {});
        }
      });
    }).catch(() => {});
    api.fetch<any>('/approvals').then((r: any) => {
      const all = r.data || r || [];
      setProjectApprovals(all.filter((a: any) => a.task?.projectId === id));
    }).catch(() => {});
    api.fetch<any>('/notifications?type=FEEDBACK_RECEIVED').then((r: any) => {
      setProjectFeedback((r.data || []).filter((n: any) => n.data?.projectId === id));
    }).catch(() => {});
    if (canManage) {
      api.getTeam?.().then((r: any) => setAllUsers(r.data || [])).catch(() => {});
    }
  }, [id]);

  const loadTasks = () => api.getTasks(id).then(setTasks).catch(() => {});

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return;
    setCreating(true);
    try {
      const data: any = {
        title: taskForm.title,
        description: taskForm.description || undefined,
        priority: taskForm.priority,
      };
      if (taskForm.dueDate) data.dueDate = taskForm.dueDate + 'T12:00:00';
      
      // Admin/Strategist can assign to anyone, others self-only
      if (canManage && taskForm.assigneeId) {
        data.assigneeId = taskForm.assigneeId;
      } else if (!canManage) {
        data.assigneeId = user?.id;
      }

      await api.createTask(id, data);
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
      loadTasks();
    } catch (err: any) { alert(err.message); }
    finally { setCreating(false); }
  };

  if (!project) return <div className="text-gray-400 text-sm p-6">Carregando...</div>;

  const members = project.members || [];
  const stages = project.stages || [];
  const taskList = tasks?.data || tasks || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/projects" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={18} className="dark:text-gray-300" />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold dark:text-white">{project.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{project.client?.name || 'Sem cliente'}</p>
        </div>
        <span className={`badge ${project.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
          {project.status}
        </span>
      </div>

      {/* Progress */}
      <div className="card mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Progresso</span>
          <span className="text-sm font-semibold dark:text-white">{project.progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-[#4B7B9C] rounded-full transition-all" style={{ width: `${project.progress}%` }} />
        </div>
        {stages.length > 0 && (
          <div className="flex gap-1 mt-3">
            {stages.map((s: any) => (
              <button key={s.id}
                onClick={async () => {
                  if (!canManage) return;
                  if (s.isActive) return;
                  try {
                    await api.fetch(`/projects/${id}/stages/${s.id}/advance`, { method: 'PATCH' });
                    api.getProject(id).then(setProject);
                  } catch {}
                }}
                disabled={!canManage || s.isActive}
                className={`flex-1 text-center text-[10px] py-1.5 rounded transition-colors ${
                s.isActive ? 'bg-[#D6E7EF] dark:bg-[#1E2F3A]/30 text-[#2A3F4E] dark:text-[#6B9AB8] font-semibold ring-1 ring-[#7BABC2] dark:ring-[#2A3F4E]'
                : s.completedAt ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : canManage ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
              }`}>
                {s.completedAt ? '✓ ' : ''}{s.name}
              </button>
            ))}
          </div>
        )}
        {canManage && stages.length > 0 && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Clique em uma etapa para avançar o progresso</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
        {(['overview', 'tasks', 'files', 'approvals', 'feedback'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === t ? 'border-[#4B7B9C] text-[#3A6280] dark:text-[#6B9AB8]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}>
            {{ overview: 'Visão geral', tasks: `Tarefas (${taskList.length})`, files: 'Arquivos', approvals: 'Aprovações', feedback: 'Feedback' }[t]}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {project.description && <div className="card"><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Descrição</h4><p className="text-sm dark:text-gray-200">{project.description}</p></div>}
            {project.briefing && <div className="card"><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Briefing</h4><p className="text-sm dark:text-gray-200 whitespace-pre-wrap">{project.briefing}</p></div>}
          </div>
          <div className="space-y-4">
            <div className="card text-sm space-y-2">
              {project.channels?.length > 0 && <div><span className="text-gray-500 dark:text-gray-400">Canais: </span><span className="dark:text-gray-200">{project.channels.join(', ')}</span></div>}
              {project.budget && <div><span className="text-gray-500 dark:text-gray-400">Orçamento: </span><span className="font-semibold dark:text-white">R$ {Number(project.budget).toLocaleString('pt-BR')}</span></div>}
              {project.startDate && <div><span className="text-gray-500 dark:text-gray-400">Início: </span><span className="dark:text-gray-200">{formatDateBR(project.startDate)}</span></div>}
              {project.endDate && <div><span className="text-gray-500 dark:text-gray-400">Prazo: </span><span className="dark:text-gray-200">{formatDateBR(project.endDate)}</span></div>}
            </div>
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Equipe ({members.length})</h4>
                {canManage && (
                  <button onClick={() => setShowAddMember(!showAddMember)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <UserPlus size={14} className="text-[#4B7B9C]" />
                  </button>
                )}
              </div>
              {showAddMember && canManage && (
                <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Adicionar membro:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {allUsers.filter((u: any) => !members.some((m: any) => m.user?.id === u.id) && !u.roles?.includes('CLIENT')).map((u: any) => (
                      <button key={u.id} onClick={async () => {
                        try { await api.fetch(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify({ userId: u.id }) }); api.getProject(id).then(setProject); setShowAddMember(false); } catch {}
                      }} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-[#EBF3F7] dark:hover:bg-[#1E2F3A]/20 text-left">
                        <Avatar firstName={u.firstName} lastName={u.lastName} size="xs" />
                        <span className="text-xs dark:text-gray-300">{u.firstName} {u.lastName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2 group">
                    <Avatar src={m.user?.avatarUrl} firstName={m.user?.firstName} lastName={m.user?.lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm dark:text-gray-200">{m.user?.firstName} {m.user?.lastName}</p>
                      {m.roleInProject && <p className="text-xs text-gray-400">{m.roleInProject}</p>}
                    </div>
                    {canManage && (
                      <button onClick={async () => {
                        try { await api.fetch(`/projects/${id}/members/${m.user?.id}`, { method: 'DELETE' }); api.getProject(id).then(setProject); } catch {}
                      }} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-opacity">
                        <UserMinus size={12} className="text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks */}
      {tab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-medium dark:text-white">Tarefas</h3>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Lista</button>
                <button onClick={() => setViewMode('kanban')} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Kanban</button>
              </div>
            </div>
            <button onClick={() => setShowTaskForm(true)} className="btn-primary text-sm">
              <Plus size={14} className="mr-1" /> Nova Tarefa
            </button>
          </div>

          {/* Task creation form */}
          {showTaskForm && (
            <div className="card mb-4 border-[#A8CBDA] dark:border-[#1E2F3A]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium dark:text-white">Nova Tarefa</h4>
                <button onClick={() => setShowTaskForm(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={14} className="text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <input className="input" placeholder="Título da tarefa *" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
                <textarea className="input min-h-[60px]" placeholder="Descrição (opcional)" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Prioridade</label>
                    <select className="input" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="LOW">Baixa</option>
                      <option value="MEDIUM">Média</option>
                      <option value="HIGH">Alta</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {canManage ? 'Responsável' : 'Responsável (você)'}
                    </label>
                    {canManage ? (
                      <select className="input" value={taskForm.assigneeId} onChange={e => setTaskForm(f => ({ ...f, assigneeId: e.target.value }))}>
                        <option value="">Sem responsável</option>
                        {members.map((m: any) => (
                          <option key={m.user?.id} value={m.user?.id}>{m.user?.firstName} {m.user?.lastName}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input bg-gray-50 dark:bg-gray-700" value={`${user?.firstName} ${user?.lastName}`} disabled />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Prazo</label>
                    <input type="date" className="input" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateTask} className="btn-primary text-sm" disabled={creating}>
                    {creating ? 'Criando...' : 'Criar tarefa'}
                  </button>
                  <button onClick={() => setShowTaskForm(false)} className="btn-secondary text-sm">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Task display */}
          {taskList.length === 0 ? (
            <div className="card text-center py-8">
              <CheckSquare size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma tarefa criada</p>
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard tasks={taskList} onStatusChange={async (taskId, newStatus) => {
              try { await api.updateTask(taskId, { status: newStatus } as any); loadTasks(); } catch {}
            }} />
          ) : (
            <div className="space-y-2">
              {taskList.map((t: any) => (
                <Link key={t.id} href={`/dashboard/tasks/${t.id}`}
                  className="card flex items-center gap-3 p-3 hover:border-[#A8CBDA] dark:hover:border-[#1E2F3A] transition-colors">
                  <div className={`w-2 h-2 rounded-full ${
                    t.status === 'DONE' ? 'bg-emerald-500' : t.status === 'IN_PROGRESS' ? 'bg-sky-500' : t.status === 'BLOCKED' ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-gray-100 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Sem responsável'}</p>
                  </div>
                  <span className={`text-xs font-semibold ${PRIORITY_COLOR[t.priority] || 'text-gray-400'}`}>{t.priority}</span>
                  <span className={`badge text-[10px] ${STATUS_BADGE[t.status] || STATUS_BADGE.TODO}`}>{t.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Files */}
      {tab === 'files' && (
        <div>
          {projectFiles.length === 0 ? (
            <div className="card text-center py-8"><p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum arquivo</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {projectFiles.map((f: any) => (
                <button key={f.id} onClick={async () => { try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
                    const token = api.getAccessToken();
                    const res = await fetch(apiUrl + '/files/' + f.id + '/download', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = f.originalName || ''; a.click();
                    URL.revokeObjectURL(url);
                  } catch {} }}
                  className="card p-0 overflow-hidden hover:shadow-md transition-all text-left group"
                  style={{ borderRadius: 'var(--radius-lg)' }}>
                  <div className="h-24 flex items-center justify-center overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    {f.mimeType?.startsWith('image/') && filePreviews[f.id] ? (
                      <img src={filePreviews[f.id]} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{f.mimeType?.startsWith('image/') ? '🖼️' : f.mimeType?.includes('pdf') ? '📄' : '📎'}</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[12px] font-medium truncate" style={{ color: 'var(--fg)' }}>{f.originalName || f.fileName}</p>
                    <p className="text-[10px]" style={{ color: 'var(--fg-hint)' }}>{f.uploadedBy ? `${f.uploadedBy.firstName} ${f.uploadedBy.lastName}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approvals */}
      {tab === 'approvals' && (
        <div>
          {projectApprovals.length === 0 ? (
            <div className="card text-center py-8"><p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma aprovação</p></div>
          ) : (
            <div className="space-y-3">
              {projectApprovals.map((a: any) => (
                <div key={a.id} className="card">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${
                      a.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : a.status === 'APPROVED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : a.status === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>{{ PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Reprovado', CHANGES_REQUESTED: 'Ajustes' }[(a.status as string)] || a.status}</span>
                    <span className="text-xs text-gray-400">{formatDateBR(a.createdAt)}</span>
                  </div>
                  <p className="font-medium dark:text-white">{a.task?.title || a.title}</p>
                  {a.requestedBy && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enviado por <span className="font-medium text-gray-700 dark:text-gray-300">{a.requestedBy.firstName} {a.requestedBy.lastName}</span>
                    </p>
                  )}
                  {a.feedback && <p className="text-sm text-[#3A6280] dark:text-[#6B9AB8] mt-1 italic">"{a.feedback}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {tab === 'feedback' && (
        <div>
          {projectFeedback.length === 0 ? (
            <div className="card text-center py-8"><p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum feedback do cliente</p></div>
          ) : (
            <div className="space-y-3">
              {projectFeedback.map((n: any) => (
                <div key={n.id} className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge bg-[#D6E7EF] dark:bg-[#1E2F3A]/30 text-[#2A3F4E] dark:text-[#6B9AB8]">Feedback do cliente</span>
                    <span className="text-xs text-gray-400">{formatDateBR(n.createdAt)}</span>
                  </div>
                  <p className="text-sm dark:text-gray-200">{n.data?.fullMessage || n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
