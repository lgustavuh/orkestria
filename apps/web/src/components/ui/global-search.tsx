'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FolderKanban, CheckSquare, FileText, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useUtils';

interface SearchResult {
  type: 'project' | 'task' | 'file' | 'client';
  id: string;
  title: string;
  subtitle?: string;
  projectId?: string;
  projectName?: string;
  rank: number;
}

const TYPE_CONFIG = {
  project: { icon: FolderKanban, color: 'text-[#4B7B9C]', bg: 'bg-[#EBF3F7]', label: 'Projeto' },
  task: { icon: CheckSquare, color: 'text-sky-500', bg: 'bg-sky-50', label: 'Tarefa' },
  file: { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Arquivo' },
  client: { icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Cliente' },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 250);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Search on debounced query
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/search?q=${encodeURIComponent(debouncedQuery)}&limit=12`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then(r => r.json())
      .then(data => { setResults(Array.isArray(data) ? data : []); setSelectedIdx(0); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const navigate = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery('');
    switch (result.type) {
      case 'project': router.push(`/dashboard/projects/${result.id}`); break;
      case 'task': router.push(`/dashboard/tasks/${result.id}`); break;
      case 'file': router.push(`/dashboard/files`); break;
      case 'client': router.push(`/dashboard/clients`); break;
    }
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIdx]) { navigate(results[selectedIdx]); }
  };

  // Trigger button (for header)
  const Trigger = () => (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-gray-50 text-sm text-gray-400 transition-colors w-56"
    >
      <Search size={14} />
      <span className="flex-1 text-left">Buscar...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 bg-white text-[10px] text-gray-400 font-mono">
        ⌘K
      </kbd>
    </button>
  );

  if (!open) return <Trigger />;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setOpen(false)} />

      {/* Search modal */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search size={18} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar projetos, tarefas, arquivos..."
              className="flex-1 text-sm outline-none placeholder:text-gray-400"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); }} className="p-1 hover:bg-gray-100 rounded">
                <X size={14} className="text-gray-400" />
              </button>
            )}
            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-400 font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Buscando...</div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                Nenhum resultado para "{query}"
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="py-1">
                {results.map((r, i) => {
                  const config = TYPE_CONFIG[r.type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => navigate(r)}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === selectedIdx ? 'bg-[#EBF3F7]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={14} className={config.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <div className="flex gap-2 text-xs text-gray-400">
                          <span>{config.label}</span>
                          {r.projectName && <span>· {r.projectName}</span>}
                          {r.subtitle && <span>· {r.subtitle}</span>}
                        </div>
                      </div>
                      {i === selectedIdx && (
                        <span className="text-[10px] text-gray-300">↵</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && query.length < 2 && (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                Digite pelo menos 2 caracteres para buscar
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
