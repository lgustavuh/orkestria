'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { Database, Download, Trash2, RotateCcw, Shield, Loader2, Upload, FileUp, HardDrive } from 'lucide-react';

export default function SuperAdminBackupPage() {
  const { show } = useToast();
  const [tab, setTab] = useState<'backup' | 'restore'>('backup');
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingFull, setCreatingFull] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadBackups(); }, []);

  const loadBackups = async () => {
    setLoading(true);
    try { setBackups(await api.fetch<any[]>('/backup')); } catch {} finally { setLoading(false); }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await api.fetch<any>('/backup', { method: 'POST' });
      show(`Backup do banco criado: ${res.fileName} (${res.sizeMB} MB)`);
      loadBackups();
    } catch (err: any) { show(err.message, 'error'); } finally { setCreating(false); }
  };

  const createFullBackup = async () => {
    setCreatingFull(true);
    try {
      const res = await api.fetch<any>('/backup/full', { method: 'POST' });
      show(res.message || 'Backup completo criado!');
      loadBackups();
    } catch (err: any) { show(err.message, 'error'); } finally { setCreatingFull(false); }
  };

  const downloadBackup = async (s3Key: string) => {
    try {
      const res = await api.fetch<any>(`/backup/download?key=${encodeURIComponent(s3Key)}`);
      window.open(res.downloadUrl, '_blank');
    } catch { show('Erro no download', 'error'); }
  };

  const restoreBackup = async (s3Key: string, fileName: string) => {
    if (!confirm(`Restaurar "${fileName}"? Todos os dados serão sobrescritos.`)) return;
    if (!confirm('Tem ABSOLUTA certeza?')) return;
    setRestoring(s3Key);
    try {
      await api.fetch('/backup/restore', { method: 'POST', body: JSON.stringify({ s3Key }) });
      show('Backup restaurado!');
    } catch (err: any) { show(err.message, 'error'); } finally { setRestoring(null); }
  };

  const deleteBackup = async (s3Key: string) => {
    if (!confirm('Excluir este backup?')) return;
    try {
      await api.fetch(`/backup?key=${encodeURIComponent(s3Key)}`, { method: 'DELETE' });
      show('Excluído');
      setBackups(prev => prev.filter(b => b.s3Key !== s3Key));
    } catch { show('Erro', 'error'); }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) validateFile(f); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) validateFile(e.target.files[0]); };
  const validateFile = (f: File) => { if (!f.name.endsWith('.sql')) { show('Apenas .sql', 'error'); return; } setUploadFile(f); };

  const handleUploadRestore = async () => {
    if (!uploadFile) return;
    if (!confirm('Restaurar? Todos os dados serão sobrescritos.')) return;
    setUploading(true);
    try {
      const text = await uploadFile.text();
      await api.fetch('/backup/restore/upload', { method: 'POST', body: JSON.stringify({ sqlContent: text, originalName: uploadFile.name }) });
      show('Restaurado!'); setUploadFile(null);
    } catch (err: any) { show(err.message, 'error'); } finally { setUploading(false); }
  };

  const fmtSize = (b: number) => !b ? '-' : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(2)} MB`;
  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

  return (
    <div>
      <h1 className="text-xl font-medium tracking-tight mb-1" style={{ color: 'var(--fg)' }}>Backup & Restauração</h1>
      <p className="text-[12px] mb-6" style={{ color: 'var(--fg-hint)' }}>Backup completo do sistema: banco de dados + arquivos MinIO</p>

      <div className="flex gap-4 mb-6" style={{ borderBottom: '0.5px solid var(--border)' }}>
        {(['backup', 'restore'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="flex items-center gap-1.5 pb-2.5 text-[13px]"
            style={{ color: tab === t ? 'var(--fg)' : 'var(--fg-hint)', fontWeight: tab === t ? 500 : 400, borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent' }}>
            {t === 'backup' ? <Database size={14} /> : <RotateCcw size={14} />}
            {t === 'backup' ? 'Backups' : 'Restaurar'}
          </button>
        ))}
      </div>

      {tab === 'backup' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-start gap-3 p-3 flex-1" style={{ background: 'var(--brand-light)', borderRadius: 'var(--radius)' }}>
              <Shield size={14} style={{ color: 'var(--brand-text)', flexShrink: 0, marginTop: 2 }} />
              <p className="text-[11px]" style={{ color: 'var(--brand-text)', lineHeight: '1.5' }}>
                <strong>Backup completo</strong> inclui o banco de dados e todos os arquivos de todas as agências armazenados no MinIO.
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={createFullBackup} disabled={creatingFull} className="flex items-center gap-2 text-[11px] px-4 py-2" style={{ background: '#059669', color: 'white', borderRadius: '10px', fontWeight: 500 }}>
                {creatingFull ? <Loader2 size={13} className="animate-spin" /> : <HardDrive size={13} />}
                {creatingFull ? 'Processando...' : 'Backup completo'}
              </button>
              <button onClick={createBackup} disabled={creating} className="btn-secondary flex items-center gap-2 text-[11px] px-4 py-2">
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
                {creating ? 'Criando...' : 'Só banco'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--fg-hint)' }} /></div>
          ) : backups.length === 0 ? (
            <div className="card text-center py-12">
              <Database size={28} style={{ color: 'var(--fg-hint)', margin: '0 auto 8px' }} />
              <p className="text-[13px]" style={{ color: 'var(--fg-hint)' }}>Nenhum backup</p>
            </div>
          ) : (
            <div style={{ borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Data</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Arquivo</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Tamanho</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Tipo</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)', textAlign: 'right' }}>Ações</td>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b: any) => (
                    <tr key={b.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--fg)' }}>{fmtDate(b.createdAt)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="text-[11px] px-2 py-0.5" style={{ background: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--fg-muted)', fontFamily: 'monospace' }}>{b.fileName}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--fg-muted)' }}>{fmtSize(b.sizeBytes)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="text-[10px] px-2 py-0.5" style={{ background: b.type === 'full' ? '#ecfdf5' : 'var(--bg-secondary)', color: b.type === 'full' ? '#059669' : 'var(--fg-hint)', borderRadius: '6px' }}>
                          {b.type === 'full' ? 'Completo' : 'Banco'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => downloadBackup(b.s3Key)} className="p-1.5" style={{ color: 'var(--brand)' }}><Download size={13} /></button>
                          <button onClick={() => deleteBackup(b.s3Key)} className="p-1.5 hover:text-red-500" style={{ color: 'var(--fg-hint)' }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'restore' && (
        <div>
          <div className="flex items-start gap-3 p-4 mb-5" style={{ background: '#fef3e2', borderRadius: 'var(--radius-lg)' }}>
            <RotateCcw size={16} style={{ color: '#92400e', flexShrink: 0, marginTop: 2 }} />
            <div className="text-[11px]" style={{ color: '#92400e', lineHeight: '1.6' }}>
              <span className="font-medium">Atenção:</span> A restauração sobrescreve TODOS os dados do banco. Crie um backup antes de restaurar.
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[12px] font-medium mb-2" style={{ color: 'var(--fg)' }}>Restaurar via upload</h3>
            <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { e.preventDefault(); setDragging(false); }} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()} className="cursor-pointer transition-all"
              style={{ border: `2px dashed ${dragging ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', background: dragging ? 'var(--brand-light)' : 'var(--bg-secondary)', padding: uploadFile ? '16px' : '32px 16px', textAlign: 'center' }}>
              <input ref={fileInputRef} type="file" accept=".sql" className="hidden" onChange={handleFileSelect} />
              {uploadFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileUp size={18} style={{ color: 'var(--brand)' }} />
                    <div className="text-left">
                      <p className="text-[12px] font-medium" style={{ color: 'var(--fg)' }}>{uploadFile.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{fmtSize(uploadFile.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); setUploadFile(null); }} className="text-[11px] px-3 py-1.5" style={{ color: 'var(--fg-hint)', background: 'var(--bg-card)', borderRadius: '8px' }}>Trocar</button>
                    <button onClick={e => { e.stopPropagation(); handleUploadRestore(); }} disabled={uploading} className="btn-primary text-[11px] flex items-center gap-1.5 px-4 py-1.5">
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} {uploading ? 'Restaurando...' : 'Restaurar'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={24} style={{ color: dragging ? 'var(--brand)' : 'var(--fg-hint)', margin: '0 auto 8px' }} />
                  <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>Arraste um arquivo <span className="font-medium">.sql</span> aqui</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--fg-hint)' }}>ou clique para selecionar</p>
                </>
              )}
            </div>
          </div>

          {backups.length > 0 && (
            <div>
              <h3 className="text-[12px] font-medium mb-2" style={{ color: 'var(--fg)' }}>Restaurar de backup existente</h3>
              <div className="space-y-2">
                {backups.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between p-4" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="flex items-center gap-3">
                      <Database size={15} style={{ color: 'var(--fg-muted)' }} />
                      <div>
                        <p className="text-[12px] font-medium" style={{ color: 'var(--fg)' }}>{b.fileName}</p>
                        <p className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{fmtDate(b.createdAt)} · {fmtSize(b.sizeBytes)}</p>
                      </div>
                    </div>
                    <button onClick={() => restoreBackup(b.s3Key, b.fileName)} disabled={restoring === b.s3Key}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium"
                      style={{ background: '#fef3e2', color: '#92400e', borderRadius: '8px' }}>
                      {restoring === b.s3Key ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      {restoring === b.s3Key ? 'Restaurando...' : 'Restaurar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
