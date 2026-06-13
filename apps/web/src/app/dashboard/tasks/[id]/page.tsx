'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateBR } from '@/lib/date';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  ArrowLeft, Send, Clock, User as UserIcon, Calendar, Flag,
  ThumbsUp, FileText, Download, X, Image as ImageIcon, Pencil, Trash2,
  FolderOpen, Link2
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'A fazer', color: 'bg-gray-400' },
  { value: 'IN_PROGRESS', label: 'Em andamento', color: 'bg-sky-500' },
  { value: 'IN_REVIEW', label: 'Em revisão', color: 'bg-[#4B7B9C]' },
  { value: 'BLOCKED', label: 'Bloqueada', color: 'bg-rose-500' },
  { value: 'DONE', label: 'Concluída', color: 'bg-emerald-500' },
];

const formatSize = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(0)}KB` : `${(b/1048576).toFixed(1)}MB`;
const isImage = (mime: string) => mime?.startsWith('image/');

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { show } = useToast();
  const [task, setTask] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [showProjectFiles, setShowProjectFiles] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => { loadTask(); loadComments(); loadFiles(); }, [id]);

  useEffect(() => {
    if (task?.projectId) {
      api.fetch<any>(`/files?projectId=${task.projectId}`).then((r: any) => {
        setProjectFiles((r.data || r || []).filter((f: any) => !f.taskId));
      }).catch(() => {});
    }
  }, [task?.projectId, files]);

  const loadTask = () => api.fetch<any>(`/tasks/${id}`).then(setTask).catch(() => {});
  const loadComments = () => api.fetch<any>(`/tasks/${id}/comments`).then((r: any) => setComments(r.data || r || [])).catch(() => setComments([]));
  const loadFiles = () => api.fetch<any>(`/files?taskId=${id}`).then((r: any) => {
    const items = r.data || r || [];
    setFiles(items);
    items.forEach((f: any) => {
      if (isImage(f.mimeType) && !previews[f.id]) {
        (() => { const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'; const token = api.getAccessToken(); fetch(apiUrl + '/files/' + f.id + '/download', { headers: token ? { Authorization: 'Bearer ' + token } : {} }).then(r => r.blob()).then(b => setPreviews(p => ({ ...p, [f.id]: URL.createObjectURL(b) }))); })().catch(() => {});
      }
    });
  }).catch(() => setFiles([]));

  const openFile = async (fileId: string) => {
    try { const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'; const token = api.getAccessToken(); const res = await fetch(apiUrl + '/files/' + fileId + '/download', { headers: token ? { Authorization: 'Bearer ' + token } : {} }); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = ''; a.click(); URL.revokeObjectURL(url); } catch {}
  };

  const attachProjectFile = async (fileId: string) => {
    try {
      await api.fetch(`/files/${fileId}/link-to-task`, { method: 'PATCH', body: JSON.stringify({ taskId: id }) });
      show('Arquivo vinculado à tarefa');
      loadFiles();
    } catch (err: any) { show(err.message, 'error'); }
  };

  const unlinkFile = async (fileId: string) => {
    try {
      await api.fetch(`/files/${fileId}/link-to-task`, { method: 'PATCH', body: JSON.stringify({ taskId: null }) });
      show('Arquivo removido da tarefa');
      loadFiles();
    } catch (err: any) { show(err.message, 'error'); }
  };

  const changeStatus = async (status: string) => {
    try { await api.updateTask(id, { status } as any); loadTask(); show('Status atualizado'); } catch (err: any) { show(err.message, 'error'); }
  };

  const submitForApproval = async () => {
    try {
      await api.fetch('/approvals', {
        method: 'POST',
        body: JSON.stringify({
          taskId: id,
          title: `Aprovação: ${task.title}`,
          description: `Tarefa "${task.title}" do projeto "${task.project?.name || ''}" enviada para aprovação do cliente.`,
          type: 'CLIENT',
        }),
      });
      await api.updateTask(id, { status: 'IN_REVIEW' } as any);
      loadTask();
      show('Enviado para aprovação do cliente');
    } catch (err: any) { show(err.message, 'error'); }
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await api.fetch(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ content: newComment }) });
      setNewComment('');
      loadComments();
    } catch (err: any) { show(err.message, 'error'); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  if (!task) return <div className="text-gray-400 text-sm p-6">Carregando...</div>;

  const isAssignee = task.assignee?.id === user?.id;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/projects/${task.projectId}`} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={18} className="dark:text-gray-300" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{task.project?.name}</p>
          <h2 className="text-xl font-semibold dark:text-white">{task.title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {task.description && (
            <div className="card">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Descrição</h4>
              <p className="text-sm dark:text-gray-200 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Task files */}
          {files.length > 0 && (
            <div className="card">
              <h4 className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--fg-hint)", letterSpacing: "0.6px" }}>Arquivos</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((f: any) => (
                  <div key={f.id} className="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-[#7BABC2] dark:hover:border-[#2A3F4E] transition-all">
                    <button onClick={() => openFile(f.id)} className="w-full h-24 bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative overflow-hidden">
                      {isImage(f.mimeType) && previews[f.id] ? <img src={previews[f.id]} className="w-full h-full object-cover" /> : isImage(f.mimeType) ? <span className="text-3xl">🖼️</span> : f.mimeType?.includes('pdf') ? <span className="text-3xl">📄</span> : <FileText size={28} className="text-gray-300" />}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Download size={18} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" />
                      </div>
                    </button>
                    <div className="p-2 flex items-center gap-1">
                      <p className="text-xs font-medium truncate dark:text-gray-200 flex-1">{f.originalName || f.fileName}</p>
                      {isAssignee && (
                        <button onClick={() => unlinkFile(f.id)} className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Remover">
                          <X size={12} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project files to attach */}
          {isAssignee && projectFiles.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--fg-hint)", letterSpacing: "0.6px" }}>
                  <FolderOpen size={13} style={{ color: "var(--brand)" }} /> Arquivos do projeto ({projectFiles.length})
                </h4>
                <button onClick={() => setShowProjectFiles(!showProjectFiles)} className="text-xs text-[#3A6280] dark:text-[#6B9AB8] font-medium">
                  {showProjectFiles ? 'Ocultar' : 'Ver arquivos'}
                </button>
              </div>
              {showProjectFiles && (
                <div className="space-y-2">
                  {projectFiles.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        {isImage(f.mimeType) ? <span className="text-lg">🖼️</span> : <FileText size={18} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate dark:text-gray-200">{f.originalName || f.fileName}</p>
                        <p className="text-[10px] text-gray-400">{f.uploadedBy ? `${f.uploadedBy.firstName} ${f.uploadedBy.lastName}` : ''} · {formatSize(Number(f.sizeBytes))}</p>
                      </div>
                      <button onClick={() => openFile(f.id)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Visualizar">
                        <Download size={12} className="text-gray-400" />
                      </button>
                      <button onClick={() => attachProjectFile(f.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EBF3F7] dark:bg-[#1E2F3A]/20 text-[#3A6280] dark:text-[#6B9AB8] hover:bg-[#D6E7EF] dark:hover:bg-[#1E2F3A]/40 text-xs font-medium">
                        <Link2 size={10} /> Anexar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversa */}
          <div className="card">
            <h4 className="text-[11px] uppercase tracking-wider mb-4" style={{ color: 'var(--fg-hint)', letterSpacing: '0.6px' }}>Conversa</h4>
            <div className="space-y-3 mb-4 max-h-[420px] overflow-y-auto scrollbar-thin">
              {comments.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--fg-hint)' }}>Nenhum comentário</p>
              ) : comments.map((cm: any) => {
                const isApproval = cm.content?.startsWith('✅') || cm.content?.startsWith('❌') || cm.content?.startsWith('🔄');
                const approvalColor = cm.content?.startsWith('✅') ? '#059669' : cm.content?.startsWith('❌') ? '#dc2626' : '#d97706';
                return (
                  <div key={cm.id} className="flex gap-2.5 group">
                    <Avatar src={cm.user?.avatarUrl} firstName={cm.user?.firstName} lastName={cm.user?.lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="inline-block max-w-[85%]" style={{
                        background: isApproval ? (cm.content?.startsWith('✅') ? '#ecfdf5' : cm.content?.startsWith('❌') ? '#fef2f2' : '#fffbeb') : 'var(--bg-secondary)',
                        borderRadius: '0 12px 12px 12px',
                        padding: '10px 14px',
                        borderLeft: isApproval ? `2px solid ${approvalColor}` : 'none',
                      }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] font-medium" style={{ color: 'var(--fg)' }}>{cm.user?.firstName}</span>
                          <span className="text-[10px]" style={{ color: 'var(--fg-hint)' }}>{timeAgo(cm.createdAt)}</span>
                          {cm.isEdited && <span className="text-[9px]" style={{ color: 'var(--fg-hint)' }}>(editado)</span>}
                          {cm.user?.id === user?.id && !editingCommentId && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingCommentId(cm.id); setEditContent(cm.content); }} className="p-0.5 rounded" style={{ color: 'var(--fg-hint)' }}><Pencil size={10} /></button>
                              <button onClick={async () => {
                                if (!confirm('Excluir comentário?')) return;
                                try { await api.fetch(`/comments/${cm.id}`, { method: 'DELETE' }); loadComments(); show('Excluído'); } catch {}
                              }} className="p-0.5 rounded hover:text-red-500" style={{ color: 'var(--fg-hint)' }}><Trash2 size={10} /></button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === cm.id ? (
                          <div>
                            <textarea className="input text-[12px] min-h-[32px]" value={editContent} onChange={e => setEditContent(e.target.value)} rows={2} />
                            <div className="flex gap-2 mt-1">
                              <button onClick={async () => {
                                try { await api.fetch(`/comments/${cm.id}`, { method: 'PATCH', body: JSON.stringify({ content: editContent }) }); setEditingCommentId(null); loadComments(); show('Atualizado'); } catch (err: any) { show(err.message, 'error'); }
                              }} className="text-[11px] font-medium" style={{ color: 'var(--brand)' }}>Salvar</button>
                              <button onClick={() => setEditingCommentId(null)} className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[12px] whitespace-pre-wrap" style={{ color: isApproval ? approvalColor : 'var(--fg-muted)', fontWeight: isApproval ? 500 : 400, lineHeight: '1.5' }}>{cm.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="flex gap-2 pt-3" style={{ borderTop: '0.5px solid var(--border)' }}>
              <div className="flex-1 flex gap-2 items-end">
                <textarea className="flex-1 min-h-[36px] max-h-24 resize-none text-[12px] px-3 py-2.5" placeholder="Escrever..."
                  value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={handleKeyDown} rows={1}
                  style={{ background: 'var(--bg-secondary)', borderRadius: '10px', border: '0.5px solid var(--border)', color: 'var(--fg)', outline: 'none' }} />
                <button onClick={sendComment} disabled={sending || !newComment.trim()}
                  className="w-8 h-8 flex items-center justify-center text-white disabled:opacity-40"
                  style={{ background: 'var(--brand)', borderRadius: '9px' }}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h4 className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--fg-hint)", letterSpacing: "0.6px" }}>Status</h4>
            <div className="space-y-1">
              {STATUS_OPTIONS.map(s => (
                <button key={s.value} onClick={() => changeStatus(s.value)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-all"
                  style={{
                    borderRadius: '10px',
                    background: task.status === s.value ? 'var(--brand-light)' : 'transparent',
                    color: task.status === s.value ? 'var(--brand-text)' : 'var(--fg-muted)',
                    fontWeight: task.status === s.value ? 500 : 400,
                  }}>
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  {s.label}
                </button>
              ))}
            </div>
            {task.status === 'IN_PROGRESS' && (
              <button onClick={submitForApproval}
                className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-medium"
                style={{ borderRadius: '10px', background: '#fef3e2', color: '#92400e', border: '0.5px solid #fde68a' }}>
                <ThumbsUp size={14} /> Enviar para aprovação
              </button>
            )}
            {task.status === 'IN_REVIEW' && (
              <div className="mt-3 px-3 py-2 text-[11px] text-center" style={{ borderRadius: '10px', background: 'var(--brand-light)', color: 'var(--brand-text)' }}>
                ⏳ Aguardando aprovação do cliente
              </div>
            )}
          </div>

          <div className="card space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              {task.assignee ? (
                <><Avatar src={task.assignee.avatarUrl} firstName={task.assignee.firstName} lastName={task.assignee.lastName} size="xs" /><span>{task.assignee.firstName} {task.assignee.lastName}</span></>
              ) : (<><UserIcon size={14} /><span>Sem responsável</span></>)}
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Flag size={14} />
              <span className={`font-medium ${{ LOW: 'text-gray-400', MEDIUM: 'text-sky-500', HIGH: 'text-amber-500', URGENT: 'text-rose-500' }[(task.priority as string)] || ''}`}>{task.priority}</span>
            </div>
            {task.dueDate && (
              <div className={`flex items-center gap-2 ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                <Calendar size={14} /><span>{formatDateBR(task.dueDate)}</span>
              </div>
            )}
            {task.createdAt && (
              <div className="flex items-center gap-2 text-gray-400">
                <Clock size={14} /><span className="text-xs">Criada em {formatDateBR(task.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
