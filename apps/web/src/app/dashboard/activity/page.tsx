'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Activity, FileText, CheckSquare, FolderKanban, ThumbsUp, Upload, LogIn, Trash2 } from 'lucide-react';

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  CREATE: { icon: FolderKanban, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', label: 'criou' },
  UPDATE: { icon: CheckSquare, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', label: 'editou' },
  DELETE: { icon: Trash2, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', label: 'excluiu' },
  LOGIN: { icon: LogIn, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20', label: 'fez login' },
  APPROVE: { icon: ThumbsUp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', label: 'aprovou' },
  REJECT: { icon: ThumbsUp, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', label: 'rejeitou' },
  UPLOAD: { icon: Upload, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20', label: 'enviou arquivo' },
  SHARE: { icon: FileText, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', label: 'compartilhou' },
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();

  useEffect(() => {
    api.fetch<any>('/audit?limit=50').then((r: any) => {
      setLogs(r.data || r || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d atrás`;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const resourceLabel = (r: string) => ({
    projects: 'projeto', tasks: 'tarefa', clients: 'cliente', users: 'usuário',
    files: 'arquivo', approvals: 'aprovação', comments: 'comentário', auth: 'sessão',
  }[r] || r);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">Atividade Recente</h2>

      {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : logs.length === 0 ? (
        <div className="card text-center py-12">
          <Activity size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-400 dark:text-gray-500">Nenhuma atividade registrada</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-4">
            {logs.map((log: any, i: number) => {
              const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
              const Icon = config.icon;
              return (
                <div key={i} className="flex gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${config.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="card flex-1 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm dark:text-gray-200">
                        <span className="font-medium">{log.user?.firstName} {log.user?.lastName}</span>
                        {' '}<span className="text-gray-500 dark:text-gray-400">{config.label}</span>{' '}
                        <span className="text-gray-600 dark:text-gray-300">{resourceLabel(log.resource)}</span>
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
