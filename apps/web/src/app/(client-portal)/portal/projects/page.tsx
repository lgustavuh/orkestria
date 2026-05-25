'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';
import { FolderKanban, Users } from 'lucide-react';

export default function PortalProjectsPage() {
  const [projects, setProjects] = useState<any>(null);

  useEffect(() => { api.portalGetProjects().then(setProjects); }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">Projetos</h2>
      {!projects ? <p className="text-gray-400 text-sm">Carregando...</p> : (projects.data || []).length === 0 ? (
        <div className="card text-center py-12">
          <FolderKanban size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-400 dark:text-gray-500">Nenhum projeto</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(projects.data || []).map((p: any) => (
            <Link key={p.id} href={`/portal/projects/${p.id}`}
              className="card hover:border-[#7BABC2] dark:hover:border-[#2A3F4E] hover:shadow-md transition-all">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold dark:text-white">{p.name}</h3>
                <span className={`badge ${p.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {p.status === 'ACTIVE' ? 'Ativo' : p.status}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-[#4B7B9C] rounded-full" style={{ width: `${p.progress}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{p.progress}%</span>
              </div>

              {/* Stages */}
              {p.stages?.length > 0 && (
                <div className="flex gap-1 mb-3">
                  {p.stages.map((s: any) => (
                    <div key={s.id} className={`flex-1 text-center text-[9px] py-0.5 rounded ${
                      s.isActive ? 'bg-[#D6E7EF] dark:bg-[#1E2F3A]/30 text-[#2A3F4E] dark:text-[#6B9AB8] font-semibold'
                      : s.completedAt ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                    }`}>{s.completedAt ? '✓' : ''} {s.name}</div>
                  ))}
                </div>
              )}

              {/* Team */}
              {p.members?.length > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={12} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Equipe</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.members.map((m: any) => (
                      <div key={m.user?.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <Avatar src={m.user?.avatarUrl} firstName={m.user?.firstName} lastName={m.user?.lastName} size="xs" />
                        <div>
                          <span className="text-xs dark:text-gray-300">{m.user?.firstName}</span>
                          {m.roleInProject && <span className="text-[9px] text-gray-400 ml-1">({m.roleInProject})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
