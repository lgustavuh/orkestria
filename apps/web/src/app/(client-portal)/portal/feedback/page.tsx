'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Send, MessageSquare } from 'lucide-react';

export default function PortalFeedbackPage() {
  const [projects, setProjects] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.portalGetProjects().then(res => {
      setProjects(res);
      if (res.data?.length > 0) setSelectedProject(res.data[0].id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !selectedProject) return;
    setSending(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portal/projects/${selectedProject}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      setSent(true);
      setContent('');
      setTimeout(() => setSent(false), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold mb-2">Feedback e solicitações</h2>
      <p className="text-sm text-gray-500 mb-6">Envie feedbacks, dúvidas ou solicitações para a equipe responsável pelo seu projeto.</p>

      {sent && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 mb-6">
          Feedback enviado com sucesso! A equipe será notificada.
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Projeto</label>
          <select className="input" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            {projects?.data?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sua mensagem</label>
          <textarea
            className="input"
            rows={5}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Descreva sua solicitação, feedback ou dúvida..."
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={sending || !content.trim()}>
          <Send size={16} className="mr-1" />
          {sending ? 'Enviando...' : 'Enviar feedback'}
        </button>
      </form>
    </div>
  );
}
