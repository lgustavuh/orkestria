'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { X } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [form, setForm] = useState({
    name: '', description: '', clientId: '', priority: 'MEDIUM',
    channels: [] as string[], budget: '', startDate: '', endDate: '',
  });

  const channelOptions = ['Instagram', 'Facebook', 'Google Ads', 'LinkedIn', 'TikTok', 'Email', 'Blog', 'YouTube', 'Twitter/X'];

  useEffect(() => {
    api.fetch<any>('/templates').then(setTemplates).catch(() => {});
    if (!hasRole('ADMIN') && !hasRole('STRATEGIST')) {
      router.push('/dashboard');
      return;
    }
    api.getClients?.({}).then((r: any) => setClients(r.data || [])).catch(() => {});
    api.getTeam?.().then((r: any) => setTeamUsers(r.data || [])).catch(() => {});
  }, []);

  const toggleChannel = (ch: string) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }));
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(m => m.includes(userId) ? m.filter(id => id !== userId) : [...m, userId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data: any = {
        name: form.name,
        description: form.description,
        priority: form.priority,
        channels: form.channels,
        memberIds: selectedMembers,
      };
      if (form.clientId) data.clientId = form.clientId;
      if (form.budget) data.budget = parseFloat(form.budget);
      if (form.startDate) data.startDate = form.startDate;
      if (form.endDate) data.endDate = form.endDate;

      const project = await api.createProject(data);
      // Apply template if selected
      if (selectedTemplate && project.id) {
        try {
          await api.fetch(`/templates/${selectedTemplate}/apply/${project.id}`, {
            method: 'POST',
            body: JSON.stringify({ startDate: project.startDate || new Date().toISOString() }),
          });
        } catch {}
      }
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar projeto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">Novo Projeto</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
        )}

        <div className="card space-y-4">
          <h3 className="font-medium dark:text-white">Informações básicas</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do projeto *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <textarea className="input min-h-[80px]" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridade</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orçamento (R$)</label>
              <input type="number" className="input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0,00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data início</label>
              <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data fim</label>
              <input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Client selection */}
        <div className="card space-y-4">
          <h3 className="font-medium dark:text-white">Cliente</h3>
          <select className="input" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
            <option value="">Selecione um cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.companyName ? `— ${c.companyName}` : ''}</option>)}
          </select>
        </div>

        {/* Channels */}
        <div className="card space-y-4">
          <h3 className="font-medium dark:text-white">Canais</h3>
          <div className="flex flex-wrap gap-2">
            {channelOptions.map(ch => (
              <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  form.channels.includes(ch)
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Team selection */}
        <div className="card space-y-4">
          <h3 className="font-medium dark:text-white">Equipe</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Selecione os membros que trabalharão neste projeto.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {teamUsers.length === 0 ? (
              <p className="text-sm text-gray-400">Carregando equipe...</p>
            ) : teamUsers.filter(u => !u.roles?.includes('CLIENT')).map((u: any) => (
              <label key={u.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                selectedMembers.includes(u.id)
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
                <input type="checkbox" checked={selectedMembers.includes(u.id)} onChange={() => toggleMember(u.id)}
                  className="rounded border-gray-300 text-indigo-600" />
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium dark:text-gray-100">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-400">{u.roles?.[0]}</p>
                </div>
              </label>
            ))}
          </div>
          {selectedMembers.length > 0 && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400">{selectedMembers.length} membro(s) selecionado(s)</p>
          )}
        </div>

        <div className="flex gap-3">
          {/* Template selector */}
        <div className="mb-4">
          <label className="block text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>Template de tarefas (opcional)</label>
          <select className="input" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
            <option value="">Sem template — criar tarefas manualmente</option>
            {templates.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} ({t._count?.tasks || t.tasks?.length || 0} tarefas){t.category ? ` — ${t.category}` : ''}</option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--brand-text)' }}>
              As tarefas do template serão criadas automaticamente ao salvar o projeto
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary text-[12px] px-4 py-2" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Projeto'}
          </button>
          <button type="button" className="btn-secondary text-[12px] px-4 py-2" onClick={() => router.back()}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
