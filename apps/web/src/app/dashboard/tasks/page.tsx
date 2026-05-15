'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { CheckSquare, AlertTriangle } from 'lucide-react';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Load tasks assigned to current user across all projects
    api.getProjects({ limit: '100' }).then(async (res: any) => {
      const allTasks: any[] = [];
      for (const p of (res.data || []).slice(0, 10)) {
        try {
          const t = await api.getTasks(p.id, { assigneeId: user?.id });
          allTasks.push(...(t.data || []).map((task: any) => ({ ...task, projectName: p.name })));
        } catch {}
      }
      setTasks(allTasks);
    });
  }, [user]);

  const overdue = tasks?.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && !['DONE', 'CANCELLED'].includes(t.status));
  const pending = tasks?.filter((t: any) => !['DONE', 'CANCELLED'].includes(t.status));

  const statusColor = (s: string) => ({
    TODO: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    IN_PROGRESS: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
    IN_REVIEW: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    BLOCKED: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    DONE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  }[s] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300');

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">Minhas Tarefas</h2>

      {overdue?.length > 0 && (
        <div className="card mb-4 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">{overdue.length} tarefa(s) atrasada(s)</span>
          </div>
        </div>
      )}

      {!tasks ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : pending?.length === 0 ? (
        <div className="card text-center py-12">
          <CheckSquare size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-400 dark:text-gray-500">Nenhuma tarefa pendente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((t: any) => (
            <Link key={t.id} href={`/dashboard/tasks/${t.id}`}
              className="card flex items-center gap-4 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors p-4">
              <div className="flex-1">
                <p className="font-medium text-sm dark:text-gray-100">{t.title}</p>
                <p className="text-xs text-gray-400">{t.projectName}</p>
              </div>
              <span className={`badge ${statusColor(t.status)}`}>{t.status}</span>
              {t.dueDate && (
                <span className={`text-xs ${new Date(t.dueDate) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                  {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
