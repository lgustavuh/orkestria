'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', projects: 'Projetos', tasks: 'Tarefas', files: 'Arquivos',
  approvals: 'Aprovações', automations: 'Automações', clients: 'Clientes',
  admin: 'Admin', settings: 'Configurações', new: 'Novo', calendar: 'Calendário',
  activity: 'Atividade',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: LABELS[seg] || (seg.length > 20 ? seg.slice(0, 8) + '...' : seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-4">
      <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300"><Home size={12} /></Link>
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight size={12} />
          {c.isLast ? (
            <span className="text-gray-600 dark:text-gray-300 font-medium">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-gray-600 dark:hover:text-gray-300">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
