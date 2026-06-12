'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { formatDateBR } from '@/lib/date';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { FileText, Upload, Download, Image as ImageIcon, Film, X, CheckCircle2, FolderKanban, Trash2, ArrowLeft, Folder } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

interface UploadingFile { file: File; progress: number; status: 'uploading' | 'done' | 'error'; error?: string; }

const formatSize = (bytes: number) => { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; };
const isImageMime = (mime: string) => mime?.startsWith('image/') && !mime?.includes('svg');
const fileEmoji = (mime: string) => {
  if (mime?.startsWith('image/')) return '🖼️';
  if (mime?.includes('pdf')) return '📄';
  if (mime?.startsWith('video/')) return '🎬';
  if (mime?.includes('word') || mime?.includes('document')) return '📝';
  if (mime?.includes('sheet') || mime?.includes('excel')) return '📊';
  if (mime?.includes('presentation') || mime?.includes('powerpoint')) return '📑';
  return '📎';
};

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [viewingProject, setViewingProject] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();
  const { user, hasRole } = useAuth();
  const canDeleteAll = hasRole('ADMIN') || hasRole('STRATEGIST');

  useEffect(() => {
    load();
    api.getProjects({ limit: '100' }).then((r: any) => setProjects(r.data || [])).catch(() => {});
  }, []);

  const load = () => api.fetch<any>('/files').then((r: any) => {
    const items = r.data || r || [];
    setFiles(items);
    // Load image previews
    items.forEach((f: any) => {
      if (isImageMime(f.mimeType) && !previews[f.id]) {
        // Preview via API proxy
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const token = api.getAccessToken();
        fetch(apiUrl + '/files/' + f.id + '/download', { headers: token ? { Authorization: 'Bearer ' + token } : {} }).then(r => r.blob()).then(b => setPreviews(p => ({ ...p, [f.id]: URL.createObjectURL(b) }))).catch(() => {});
      }
    });
  }).catch(() => setFiles([]));

  const uploadFile = async (file: File) => {
    const entry: UploadingFile = { file, progress: 0, status: 'uploading' };
    setUploading(prev => [...prev, entry]);
    const update = (p: number, s: UploadingFile['status'] = 'uploading') => setUploading(prev => prev.map(u => u.file === file ? { ...u, progress: p, status: s } : u));
    try {
      update(10);
      const formData = new FormData();
      formData.append('file', file);
      if (selectedProjectId) formData.append('projectId', selectedProjectId);
      
      const token = api.getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) update(10 + Math.round((e.loaded / e.total) * 80)); });
        xhr.addEventListener('load', () => xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`)));
        xhr.addEventListener('error', () => reject(new Error('Erro de rede')));
        xhr.open('POST', apiUrl + '/files/upload-direct');
        if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.send(formData);
      });
      update(100, 'done');
      show(`${file.name} enviado`);
      load();
      setTimeout(() => setUploading(prev => prev.filter(u => u.file !== file)), 2000);
    } catch (err: any) {
      setUploading(prev => prev.map(u => u.file === file ? { ...u, status: 'error', error: err.message } : u));
      show(err.message, 'error');
    }
  };

  const handleFiles = (fl: FileList | null) => { if (fl) Array.from(fl).forEach(uploadFile); };

  const openFile = async (fileId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const token = api.getAccessToken();
      const res = await fetch(apiUrl + '/files/' + fileId + '/download', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.click();
      URL.revokeObjectURL(url);
    } catch { show('Erro ao abrir', 'error'); }
  };

  const deleteFile = async (fileId: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    try { await api.fetch(`/files/${fileId}`, { method: 'DELETE' }); show('Arquivo excluído'); load(); } catch (err: any) { show(err.message, 'error'); }
  };

  // Group files by project
  const grouped = files.reduce<Record<string, { name: string; clientName?: string; files: any[] }>>((acc, f) => {
    const key = f.projectId || '_general';
    if (!acc[key]) acc[key] = { name: f.project?.name || 'Geral', clientName: f.project?.client?.name, files: [] };
    acc[key].files.push(f);
    return acc;
  }, {});

  const currentFiles = viewingProject ? (grouped[viewingProject]?.files || []) : [];
  const projectGroups = Object.entries(grouped);

  const canDelete = (f: any) => canDeleteAll || f.uploadedBy?.id === user?.id;

  const FileCard = ({ f }: { f: any }) => {
    const hasPreview = isImageMime(f.mimeType) && previews[f.id];
    return (
      <div className="group card p-0 overflow-hidden hover:border-[#7BABC2] dark:hover:border-[#2A3F4E] hover:shadow-md transition-all">
        <button onClick={() => openFile(f.id)} className="w-full h-32 bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative overflow-hidden">
          {hasPreview ? (
            <img src={previews[f.id]} alt={f.originalName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">{fileEmoji(f.mimeType)}</span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Download size={20} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" />
          </div>
        </button>
        <div className="p-3">
          <p className="text-sm font-medium truncate dark:text-gray-100">{f.originalName || f.fileName}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {f.uploadedBy && <Avatar firstName={f.uploadedBy.firstName} lastName={f.uploadedBy.lastName} size="xs" />}
            <p className="text-[10px] text-gray-400 truncate flex-1">{f.uploadedBy ? `${f.uploadedBy.firstName} ${f.uploadedBy.lastName}` : ''}</p>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-400">{formatSize(Number(f.sizeBytes))} · {f.createdAt ? formatDateBR(f.createdAt) : ''}</span>
            {canDelete(f) && (
              <button onClick={(e) => { e.stopPropagation(); deleteFile(f.id, f.originalName || f.fileName); }}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-opacity">
                <Trash2 size={12} className="text-red-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">Arquivos</h2>

      {/* Upload area */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <FolderKanban size={16} className="text-gray-400" />
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Enviar para o projeto:</label>
            <select className="input text-sm" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
              <option value="">Geral (sem projeto)</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.client?.name ? ` — ${p.client.name}` : ''}</option>)}
            </select>
          </div>
        </div>
        <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#6B9AB8] bg-[#EBF3F7] dark:bg-[#1E2F3A]/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
          <Upload size={24} className={`mx-auto mb-2 ${dragOver ? 'text-[#4B7B9C]' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-500 dark:text-gray-400">Arraste ou <span className="text-[#3A6280] dark:text-[#6B9AB8] font-medium">clique</span></p>
          <input ref={inputRef} type="file" className="hidden" multiple onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
        </div>
      </div>

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="space-y-2 mb-6">
          {uploading.map((u, i) => (
            <div key={i} className="card flex items-center gap-3 p-3">
              <FileText size={16} className={u.status === 'error' ? 'text-red-400' : u.status === 'done' ? 'text-emerald-500' : 'text-gray-400'} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate dark:text-gray-200">{u.file.name}</p>
                {u.status === 'error' ? <p className="text-xs text-red-500">{u.error}</p>
                  : u.status === 'done' ? <p className="text-xs text-emerald-500"><CheckCircle2 size={12} className="inline" /> Concluído</p>
                  : <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1"><div className="h-full bg-[#4B7B9C] rounded-full" style={{ width: `${u.progress}%` }} /></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File browser */}
      {files.length === 0 ? (
        <div className="card text-center py-12"><FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" /><p className="text-gray-400 text-sm">Nenhum arquivo</p></div>
      ) : viewingProject ? (
        /* Inside a project folder */
        <div>
          <button onClick={() => setViewingProject(null)} className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <ArrowLeft size={16} /> Voltar para pastas
          </button>
          <h3 className="text-lg font-medium mb-4 dark:text-white">{grouped[viewingProject]?.name || 'Arquivos'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentFiles.map((f: any) => <FileCard key={f.id} f={f} />)}
          </div>
        </div>
      ) : (
        /* Project folders view */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {projectGroups.map(([key, group]) => (
            <button key={key} onClick={() => setViewingProject(key)}
              className="card p-4 text-center hover:border-[#7BABC2] dark:hover:border-[#2A3F4E] hover:shadow-md transition-all group">
              <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-[#EBF3F7] dark:bg-[#1E2F3A]/20 flex items-center justify-center group-hover:bg-[#D6E7EF] dark:group-hover:bg-[#1E2F3A]/40 transition-colors">
                <Folder size={28} className="text-[#4B7B9C]" />
              </div>
              <p className="text-sm font-medium truncate dark:text-white">{group.name}</p>
              {group.clientName && <p className="text-[10px] text-gray-400 truncate">{group.clientName}</p>}
              <p className="text-xs text-gray-400 mt-1">{group.files.length} arquivo{group.files.length !== 1 ? 's' : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
