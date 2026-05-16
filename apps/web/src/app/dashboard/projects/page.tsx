'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Plus, Search, Trash2, Edit, Filter, X } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN') || hasRole('STRATEGIST');

  useEffect(() => {
    const params: any = { limit: '50' };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    api.getProjects(params).then(setProjects);
  }, [search, statusFilter, priorityFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o projeto "${name}"?`)) return;
    try { await api.fetch(`/projects/${id}`, { method: 'DELETE' }); setProjects((p: any) => ({ ...p, data: p.data.filter((x: any) => x.id !== id) })); } catch (err: any) { alert(err.message); }
  };

  const clearFilters = () => { setStatusFilter(''); setPriorityFilter(''); setSearch(''); };
  const hasFilters = statusFilter || priorityFilter || search;

  const statusBadge = (s: string) => ({
    ACTIVE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    COMPLETED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    PAUSED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  }[s] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold dark:text-white">Projetos</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary text-sm ${hasFilters ? 'ring-1 ring-indigo-300 dark:ring-indigo-700' : ''}`}>
            <Filter size={14} className="mr-1" /> Filtros {hasFilters && <span className="ml-1 w-2 h-2 rounded-full bg-indigo-500 inline-block" />}
          </button>
          {canManage && <Link href="/dashboard/projects/new" className="btn-primary text-sm"><Plus size={14} className="mr-1" /> Novo</Link>}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium dark:text-white">Filtros</h4>
            {hasFilters && <button onClick={clearFilters} className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><X size={12} /> Limpar</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Buscar</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-8 text-sm" placeholder="Nome do projeto..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select className="input text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="DRAFT">Rascunho</option>
                <option value="ACTIVE">Ativo</option>
                <option value="PAUSED">Pausado</option>
                <option value="COMPLETED">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prioridade</label>
              <select className="input text-sm" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="">Todas</option>
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!projects ? <p className="text-gray-400 text-sm">Carregando...</p> : projects.data?.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-400 dark:text-gray-500">Nenhum projeto encontrado</p></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Projeto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Progresso</th>
                {canManage && <th className="px-4 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {projects.data.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/projects/${p.id}`} className="font-medium hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">{p.client?.name || '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` }} /></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{p.progress}%</span>
                    </div>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`/dashboard/projects/${p.id}`} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={14} className="text-gray-400" /></Link>
                        <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-400" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
