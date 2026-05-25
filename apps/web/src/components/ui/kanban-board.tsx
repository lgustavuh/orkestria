'use client';

import { Avatar } from './avatar';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  dueDate?: string;
  _count?: { comments: number; files: number };
}

interface Props {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const COLUMNS = [
  { key: 'TODO', label: 'A fazer', dot: '#cbd5e1' },
  { key: 'IN_PROGRESS', label: 'Em andamento', dot: '#60a5fa' },
  { key: 'IN_REVIEW', label: 'Em revisão', dot: '#a78bfa' },
  { key: 'BLOCKED', label: 'Bloqueada', dot: '#f87171' },
  { key: 'DONE', label: 'Concluída', dot: '#34d399' },
];

const priorityStyle: Record<string, { bg: string; color: string; label: string }> = {
  LOW: { bg: 'var(--bg-secondary)', color: 'var(--fg-hint)', label: 'baixa' },
  MEDIUM: { bg: '#fef3c7', color: '#92400e', label: 'média' },
  HIGH: { bg: '#fee2e2', color: '#dc2626', label: 'alta' },
  URGENT: { bg: '#fee2e2', color: '#dc2626', label: 'urgente' },
};

export function KanbanBoard({ tasks, onStatusChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);

  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => { if (target) target.style.opacity = '0.4'; }, 0);
  }, []);

  const onDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    if (target) target.style.opacity = '1';
    setDragId(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) onStatusChange(id, status);
  }, [onStatusChange]);

  return (
    <div className="grid grid-cols-5 gap-3">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, col.key)}
            className="min-h-[200px]">
            <div className="flex items-center gap-1.5 mb-2.5 px-1">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot }} />
              <span className="text-[11px]" style={{ color: 'var(--fg-hint)', letterSpacing: '0.3px' }}>{col.label}</span>
              <span className="text-[10px] px-1.5 py-0" style={{ background: 'var(--border)', borderRadius: '6px', color: 'var(--fg-hint)' }}>{colTasks.length}</span>
            </div>
            <div className="space-y-2">
              {colTasks.map(task => {
                const p = priorityStyle[task.priority] || priorityStyle.LOW;
                const isDone = col.key === 'DONE';
                return (
                  <Link key={task.id} href={`/dashboard/tasks/${task.id}`}
                    draggable onDragStart={e => onDragStart(e, task.id)} onDragEnd={onDragEnd}
                    className="block p-3 transition-all hover:shadow-md"
                    style={{
                      background: 'var(--bg-card)', borderRadius: 'var(--radius)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      opacity: isDone ? 0.55 : 1,
                      borderLeft: col.key === 'IN_REVIEW' ? '3px solid #a78bfa' : 'none',
                      borderRadius: col.key === 'IN_REVIEW' ? '0 12px 12px 0' : 'var(--radius)',
                    }}>
                    <p className="text-[12px] font-medium mb-2" style={{ color: isDone ? 'var(--fg-muted)' : 'var(--fg)', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</p>
                    {col.key === 'IN_REVIEW' && <p className="text-[9px] mb-2" style={{ color: '#4B7B9C' }}>aguardando cliente</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] px-1.5 py-0.5" style={{ background: p.bg, color: p.color, borderRadius: '5px' }}>{p.label}</span>
                      {task.assignee && <Avatar src={task.assignee.avatarUrl} firstName={task.assignee.firstName} lastName={task.assignee.lastName} size="xs" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
