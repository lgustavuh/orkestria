'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Plus, Trash2, Play, FileText, ChevronDown, ChevronRight, GripVertical, X } from 'lucide-react';

const ROLES = [
  { value: '', label: 'Sem atribuição automática' },
  { value: 'STRATEGIST', label: 'Estrategista' },
  { value: 'COPYWRITER', label: 'Copywriter' },
  { value: 'TRAFFIC_MANAGER', label: 'Gestor de Tráfego' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'DESIGNER', label: 'Designer' },
];

const STAGES = ['Backlog', 'Planejamento', 'Produção', 'Revisão', 'Aprovação', 'Concluído'];
const PRIORITIES = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

export default function AutomationsPage() {
  const { hasRole } = useAuth();
  const { show } = useToast();
  const canManage = hasRole('ADMIN') || hasRole('STRATEGIST');

  const [templates, setTemplates] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyProject, setApplyProject] = useState('');
  const [applyDate, setApplyDate] = useState(new Date().toISOString().split('T')[0]);

  // New template form
  const [form, setForm] = useState({ name: '', description: '', category: '' });
  const [taskForms, setTaskForms] = useState<any[]>([]);

  // New task form for existing template
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', stage: 'Produção', priority: 'MEDIUM', assigneeRole: '', dueDaysOffset: 7, estimatedHours: '' });

  useEffect(() => {
    load();
    api.getProjects({ limit: '100' }).then((r: any) => setProjects(r.data || [])).catch(() => {});
  }, []);

  const load = () => api.fetch<any>('/templates').then(setTemplates).catch(() => setTemplates([]));

  const addTaskForm = () => {
    setTaskForms([...taskForms, { title: '', description: '', stage: 'Produção', priority: 'MEDIUM', assigneeRole: '', dueDaysOffset: (taskForms.length + 1) * 7, estimatedHours: '' }]);
  };

  const updateTaskForm = (i: number, key: string, value: any) => {
    setTaskForms(taskForms.map((t, j) => j === i ? { ...t, [key]: value } : t));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { show('Nome obrigatório', 'error'); return; }
    try {
      await api.fetch('/templates', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          tasks: taskForms.filter(t => t.title.trim()).map((t, i) => ({
            ...t,
            dueDaysOffset: Number(t.dueDaysOffset) || 0,
            estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : undefined,
            order: i,
          })),
        }),
      });
      show('Template criado');
      setShowCreate(false);
      setForm({ name: '', description: '', category: '' });
      setTaskForms([]);
      load();
    } catch (err: any) { show(err.message, 'error'); }
  };

  const handleAddTask = async (templateId: string) => {
    if (!newTask.title.trim()) return;
    try {
      await api.fetch(`/templates/${templateId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          ...newTask,
          dueDaysOffset: Number(newTask.dueDaysOffset) || 0,
          estimatedHours: newTask.estimatedHours ? Number(newTask.estimatedHours) : undefined,
        }),
      });
      show('Tarefa adicionada');
      setAddingTaskTo(null);
      setNewTask({ title: '', description: '', stage: 'Produção', priority: 'MEDIUM', assigneeRole: '', dueDaysOffset: 7, estimatedHours: '' });
      load();
    } catch (err: any) { show(err.message, 'error'); }
  };

  const handleApply = async (templateId: string) => {
    if (!applyProject) { show('Selecione um projeto', 'error'); return; }
    try {
      const res = await api.fetch<any>(`/templates/${templateId}/apply/${applyProject}`, {
        method: 'POST',
        body: JSON.stringify({ startDate: applyDate }),
      });
      show(`${res.tasksCreated} tarefas criadas`);
      setApplyingId(null);
    } catch (err: any) { show(err.message, 'error'); }
  };

  const TaskRow = ({ t, templateId }: { t: any; templateId: string }) => (
    <div className="flex items-center gap-3 py-2.5 px-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
      <GripVertical size={12} style={{ color: 'var(--fg-hint)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium" style={{ color: 'var(--fg)' }}>{t.title}</p>
        {t.description && <p className="text-[10px] truncate" style={{ color: 'var(--fg-hint)' }}>{t.description}</p>}
      </div>
      <span className="text-[10px] px-2 py-0.5" style={{ background: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--fg-muted)' }}>{t.stage}</span>
      <span className="text-[10px]" style={{ color: 'var(--fg-hint)' }}>{t.dueDaysOffset}d</span>
      {t.assigneeRole && <span className="text-[10px] px-2 py-0.5" style={{ background: 'var(--brand-light)', borderRadius: '6px', color: 'var(--brand-text)' }}>{ROLES.find(r => r.value === t.assigneeRole)?.label || t.assigneeRole}</span>}
      {canManage && (
        <button onClick={async () => {
          if (!confirm('Remover?')) return;
          try { await api.fetch(`/templates/${templateId}/tasks/${t.id}`, { method: 'DELETE' }); load(); } catch {}
        }} className="p-1 hover:text-red-500" style={{ color: 'var(--fg-hint)' }}><Trash2 size={12} /></button>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ color: 'var(--fg)' }}>Automações</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--fg-hint)' }}>Templates de projeto com tarefas automáticas</p>
        </div>
        {canManage && (
          <button onClick={() => { setShowCreate(true); addTaskForm(); }} className="btn-primary flex items-center gap-2 text-[12px]">
            <Plus size={14} /> Novo template
          </button>
        )}
      </div>

      {/* Create template form */}
      {showCreate && (
        <div className="card mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-medium" style={{ color: 'var(--fg)' }}>Novo template</h3>
            <button onClick={() => { setShowCreate(false); setTaskForms([]); }} style={{ color: 'var(--fg-hint)' }}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Nome do template</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Campanha de lançamento" />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Categoria</label>
              <input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Lançamento, Redes Sociais" />
            </div>
            <div>
              <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Descrição</label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <h4 className="text-[11px] uppercase tracking-wider mb-3" style={{ color: 'var(--fg-hint)', letterSpacing: '0.6px' }}>Tarefas do template</h4>
          <div className="space-y-2 mb-3">
            {taskForms.map((t, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 items-start p-3" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                <div className="col-span-2">
                  <input className="input text-[11px]" value={t.title} onChange={e => updateTaskForm(i, 'title', e.target.value)} placeholder="Nome da tarefa" />
                </div>
                <select className="input text-[11px]" value={t.stage} onChange={e => updateTaskForm(i, 'stage', e.target.value)}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="input text-[11px]" value={t.assigneeRole} onChange={e => updateTaskForm(i, 'assigneeRole', e.target.value)}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <input type="number" className="input text-[11px]" value={t.dueDaysOffset} onChange={e => updateTaskForm(i, 'dueDaysOffset', e.target.value)} />
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--fg-hint)' }}>dias</span>
                </div>
                <div className="flex items-center gap-1">
                  <select className="input text-[11px]" value={t.priority} onChange={e => updateTaskForm(i, 'priority', e.target.value)}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button onClick={() => setTaskForms(taskForms.filter((_, j) => j !== i))} className="p-1 flex-shrink-0" style={{ color: 'var(--fg-hint)' }}><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addTaskForm} className="btn-secondary text-[11px] flex items-center gap-1"><Plus size={12} /> Tarefa</button>
            <div className="flex-1" />
            <button onClick={() => { setShowCreate(false); setTaskForms([]); }} className="btn-secondary text-[12px]">Cancelar</button>
            <button onClick={handleCreate} className="btn-primary text-[12px]">Criar template</button>
          </div>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !showCreate ? (
        <div className="card text-center py-12">
          <FileText size={28} style={{ color: 'var(--fg-hint)', margin: '0 auto 8px' }} />
          <p className="text-[13px]" style={{ color: 'var(--fg-hint)' }}>Nenhum template criado</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--fg-hint)' }}>Crie templates para automatizar a criação de tarefas nos projetos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl: any) => {
            const isExpanded = expandedId === tpl.id;
            return (
              <div key={tpl.id} className="card p-0 overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                  className="w-full flex items-center gap-3 p-4 text-left transition-colors"
                  style={{ borderBottom: isExpanded ? '0.5px solid var(--border)' : 'none' }}>
                  {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--fg-hint)' }} /> : <ChevronRight size={14} style={{ color: 'var(--fg-hint)' }} />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--fg)' }}>{tpl.name}</span>
                      {tpl.category && <span className="text-[10px] px-2 py-0.5" style={{ background: 'var(--brand-light)', borderRadius: '6px', color: 'var(--brand-text)' }}>{tpl.category}</span>}
                    </div>
                    {tpl.description && <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-hint)' }}>{tpl.description}</p>}
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{tpl._count?.tasks || tpl.tasks?.length || 0} tarefas</span>
                </button>

                {isExpanded && (
                  <div>
                    {tpl.tasks?.map((t: any) => <TaskRow key={t.id} t={t} templateId={tpl.id} />)}

                    {/* Add task to existing template */}
                    {addingTaskTo === tpl.id ? (
                      <div className="p-3 grid grid-cols-6 gap-2 items-start" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="col-span-2">
                          <input className="input text-[11px]" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} placeholder="Nome da tarefa" />
                        </div>
                        <select className="input text-[11px]" value={newTask.stage} onChange={e => setNewTask(t => ({ ...t, stage: e.target.value }))}>
                          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select className="input text-[11px]" value={newTask.assigneeRole} onChange={e => setNewTask(t => ({ ...t, assigneeRole: e.target.value }))}>
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <div className="flex items-center gap-1">
                          <input type="number" className="input text-[11px]" value={newTask.dueDaysOffset} onChange={e => setNewTask(t => ({ ...t, dueDaysOffset: e.target.value as any }))} />
                          <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--fg-hint)' }}>dias</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleAddTask(tpl.id)} className="btn-primary text-[10px] px-2 py-1">Add</button>
                          <button onClick={() => setAddingTaskTo(null)} className="btn-secondary text-[10px] px-2 py-1">X</button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2 p-3">
                      {canManage && (
                        <>
                          <button onClick={() => setAddingTaskTo(tpl.id)} className="btn-secondary text-[11px] flex items-center gap-1 py-1.5"><Plus size={11} /> Tarefa</button>
                          <button onClick={() => setApplyingId(applyingId === tpl.id ? null : tpl.id)} className="btn-primary text-[11px] flex items-center gap-1 py-1.5"><Play size={11} /> Aplicar a projeto</button>
                        </>
                      )}
                    </div>

                    {applyingId === tpl.id && (
                      <div className="px-3 pb-3 flex items-end gap-2" style={{ background: 'var(--bg-secondary)', borderTop: '0.5px solid var(--border)', padding: '12px' }}>
                        <div className="flex-1">
                          <label className="block text-[10px] mb-1" style={{ color: 'var(--fg-muted)' }}>Projeto</label>
                          <select className="input text-[11px]" value={applyProject} onChange={e => setApplyProject(e.target.value)}>
                            <option value="">Selecione...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] mb-1" style={{ color: 'var(--fg-muted)' }}>Data início</label>
                          <input type="date" className="input text-[11px]" value={applyDate} onChange={e => setApplyDate(e.target.value)} />
                        </div>
                        <button onClick={() => handleApply(tpl.id)} className="btn-primary text-[11px] py-2">Criar tarefas</button>
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
