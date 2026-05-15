'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Database, Download, Trash2, RotateCcw, Shield, Loader2, Upload, FileUp } from 'lucide-react';

export default function BackupPage() {
  const { hasRole } = useAuth();
  const { show } = useToast();
  const canManage = hasRole('ADMIN') || hasRole('STRATEGIST');

  const [tab, setTab] = useState<'backup' | 'restore'>('backup');
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  // Drag/drop state
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadBackups(); }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await api.fetch<any[]>('/backup');
      setBackups(data);
    } catch {} finally { setLoading(false); }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await api.fetch<any>('/backup', { method: 'POST' });
      show(`Backup criado: ${res.fileName} (${res.sizeMB} MB)`);
      loadBackups();
    } catch (err: any) { show(err.message || 'Erro ao criar backup', 'error'); }
    finally { setCreating(false); }
  };

  const downloadBackup = async (s3Key: string) => {
    try {
      const res = await api.fetch<any>(`/backup/download?key=${encodeURIComponent(s3Key)}`);
      window.open(res.downloadUrl, '_blank');
    } catch { show('Erro no download', 'error'); }
  };

  const restoreBackup = async (s3Key: string, fileName: string) => {
    if (!confirm(`ATENÇÃO: Restaurar "${fileName}" irá SOBRESCREVER todos os dados atuais.\n\nContinuar?`)) return;
    if (!confirm('Tem ABSOLUTA certeza? Esta ação não pode ser desfeita.')) return;
    setRestoring(s3Key);
    try {
      await api.fetch('/backup/restore', { method: 'POST', body: JSON.stringify({ s3Key }) });
      show('Backup restaurado com sucesso! Recarregue a página.');
    } catch (err: any) { show(err.message || 'Erro ao restaurar', 'error'); }
    finally { setRestoring(null); }
  };

  const deleteBackup = async (s3Key: string) => {
    if (!confirm('Excluir este backup permanentemente?')) return;
    try {
      await api.fetch(`/backup?key=${encodeURIComponent(s3Key)}`, { method: 'DELETE' });
      show('Backup excluído');
      setBackups(prev => prev.filter(b => b.s3Key !== s3Key));
    } catch { show('Erro ao excluir', 'error'); }
  };

  // Drag/drop handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    if (!file.name.endsWith('.sql')) { show('Apenas arquivos .sql são aceitos', 'error'); return; }
    if (file.size > 500 * 1024 * 1024) { show('Arquivo muito grande (máx 500MB)', 'error'); return; }
    setUploadFile(file);
  };

  const handleUploadRestore = async () => {
    if (!uploadFile) return;
    if (!confirm(`Restaurar "${uploadFile.name}" vai SOBRESCREVER todos os dados.\n\nContinuar?`)) return;
    if (!confirm('Tem ABSOLUTA certeza?')) return;

    setUploading(true);
    try {
      const text = await uploadFile.text();
      await api.fetch('/backup/restore/upload', {
        method: 'POST',
        body: JSON.stringify({ sqlContent: text, originalName: uploadFile.name }),
      });
      show('Backup restaurado com sucesso! Recarregue a página.');
      setUploadFile(null);
    } catch (err: any) { show(err.message || 'Erro ao restaurar', 'error'); }
    finally { setUploading(false); }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!canManage) return <p className="text-sm" style={{ color: 'var(--fg-hint)' }}>Sem permissão</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-tight" style={{ color: 'var(--fg)' }}>Backup & Restauração</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--fg-hint)' }}>Gerencie backups do banco de dados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6" style={{ borderBottom: '0.5px solid var(--border)' }}>
        <button onClick={() => setTab('backup')} className="flex items-center gap-1.5 pb-2.5 text-[13px] transition-colors"
          style={{ color: tab === 'backup' ? 'var(--fg)' : 'var(--fg-hint)', fontWeight: tab === 'backup' ? 500 : 400, borderBottom: tab === 'backup' ? '2px solid var(--brand)' : '2px solid transparent' }}>
          <Database size={14} /> Backups
        </button>
        <button onClick={() => setTab('restore')} className="flex items-center gap-1.5 pb-2.5 text-[13px] transition-colors"
          style={{ color: tab === 'restore' ? 'var(--fg)' : 'var(--fg-hint)', fontWeight: tab === 'restore' ? 500 : 400, borderBottom: tab === 'restore' ? '2px solid var(--brand)' : '2px solid transparent' }}>
          <RotateCcw size={14} /> Restaurar
        </button>
      </div>

      {/* ===== BACKUP TAB ===== */}
      {tab === 'backup' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-start gap-3 p-3 flex-1 mr-4" style={{ background: 'var(--brand-light)', borderRadius: 'var(--radius)' }}>
              <Shield size={14} style={{ color: 'var(--brand-text)', flexShrink: 0, marginTop: 2 }} />
              <p className="text-[11px]" style={{ color: 'var(--brand-text)', opacity: 0.85, lineHeight: '1.5' }}>
                O backup exporta todo o banco de dados. Os arquivos do MinIO/S3 devem ser copiados separadamente.
              </p>
            </div>
            <button onClick={createBackup} disabled={creating} className="btn-primary flex items-center gap-2 text-[12px] flex-shrink-0">
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              {creating ? 'Criando...' : 'Novo backup'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--fg-hint)' }} /></div>
          ) : backups.length === 0 ? (
            <div className="card text-center py-12">
              <Database size={28} style={{ color: 'var(--fg-hint)', margin: '0 auto 8px' }} />
              <p className="text-[13px]" style={{ color: 'var(--fg-hint)' }}>Nenhum backup realizado</p>
            </div>
          ) : (
            <div style={{ borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Data</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Arquivo</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Tamanho</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)' }}>Criado por</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-hint)', textAlign: 'right' }}>Ações</td>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b: any) => (
                    <tr key={b.id} style={{ borderTop: '0.5px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--fg)' }}>{formatDate(b.createdAt)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="text-[11px] px-2 py-0.5" style={{ background: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--fg-muted)', fontFamily: 'monospace' }}>{b.fileName}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--fg-muted)' }}>{formatSize(b.sizeBytes)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--fg-muted)' }}>{b.createdBy}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => downloadBackup(b.s3Key)} title="Download" className="p-1.5" style={{ color: 'var(--brand)', borderRadius: '7px' }}><Download size={13} /></button>
                          <button onClick={() => deleteBackup(b.s3Key)} title="Excluir" className="p-1.5 hover:text-red-500" style={{ color: 'var(--fg-hint)', borderRadius: '7px' }}><Trash2 size={13} /></button>
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

      {/* ===== RESTORE TAB ===== */}
      {tab === 'restore' && (
        <div>
          <div className="flex items-start gap-3 p-4 mb-5" style={{ background: '#fef3e2', borderRadius: 'var(--radius-lg)' }}>
            <RotateCcw size={16} style={{ color: '#92400e', flexShrink: 0, marginTop: 2 }} />
            <div className="text-[11px]" style={{ color: '#92400e', lineHeight: '1.6' }}>
              <span className="font-medium">Atenção:</span> A restauração sobrescreve TODOS os dados atuais do sistema.
              Recomendamos criar um backup antes de restaurar. Esta ação não pode ser desfeita.
            </div>
          </div>

          {/* Drag & Drop upload zone */}
          <div className="mb-6">
            <h3 className="text-[12px] font-medium mb-2" style={{ color: 'var(--fg)' }}>Restaurar via upload</h3>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragging ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                background: dragging ? 'var(--brand-light)' : 'var(--bg-secondary)',
                padding: uploadFile ? '16px' : '32px 16px',
                textAlign: 'center',
              }}>
              <input ref={fileInputRef} type="file" accept=".sql" className="hidden" onChange={handleFileSelect} />

              {uploadFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center" style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '0.5px solid var(--border)' }}>
                      <FileUp size={18} style={{ color: 'var(--brand)' }} />
                    </div>
                    <div className="text-left">
                      <p className="text-[12px] font-medium" style={{ color: 'var(--fg)' }}>{uploadFile.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{formatSize(uploadFile.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                      className="text-[11px] px-3 py-1.5" style={{ color: 'var(--fg-hint)', background: 'var(--bg-card)', borderRadius: '8px', border: '0.5px solid var(--border)' }}>
                      Trocar
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleUploadRestore(); }} disabled={uploading}
                      className="btn-primary text-[11px] flex items-center gap-1.5 px-4 py-1.5">
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      {uploading ? 'Restaurando...' : 'Restaurar'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={24} style={{ color: dragging ? 'var(--brand)' : 'var(--fg-hint)', margin: '0 auto 8px' }} />
                  <p className="text-[12px]" style={{ color: dragging ? 'var(--brand-text)' : 'var(--fg-muted)' }}>
                    Arraste um arquivo <span className="font-medium">.sql</span> aqui
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--fg-hint)' }}>ou clique para selecionar</p>
                </>
              )}
            </div>
          </div>

          {/* Existing backups to restore */}
          {backups.length > 0 && (
            <div>
              <h3 className="text-[12px] font-medium mb-2" style={{ color: 'var(--fg)' }}>Restaurar de um backup existente</h3>
              <div className="space-y-2">
                {backups.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between p-4" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '0.5px solid var(--border)' }}>
                        <Database size={15} style={{ color: 'var(--fg-muted)' }} />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium" style={{ color: 'var(--fg)' }}>{b.fileName}</p>
                        <p className="text-[11px]" style={{ color: 'var(--fg-hint)' }}>{formatDate(b.createdAt)} · {formatSize(b.sizeBytes)} · por {b.createdBy}</p>
                      </div>
                    </div>
                    <button onClick={() => restoreBackup(b.s3Key, b.fileName)} disabled={restoring === b.s3Key}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium"
                      style={{ background: '#fef3e2', color: '#92400e', borderRadius: '8px', border: '0.5px solid #fde68a' }}>
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
