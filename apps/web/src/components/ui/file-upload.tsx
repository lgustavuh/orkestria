'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Film, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface FileUploadProps {
  projectId: string;
  taskId?: string;
  onUploadComplete: (file: any) => void;
  accept?: string;
  maxSizeMB?: number;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'registering' | 'done' | 'error';
  error?: string;
}

const iconForMime = (mime: string) => {
  if (mime.startsWith('image/')) return Image;
  if (mime.startsWith('video/')) return Film;
  return FileText;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export function FileUpload({ projectId, taskId, onUploadComplete, accept, maxSizeMB = 100 }: FileUploadProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploading(prev => [...prev, { file, progress: 0, status: 'error', error: `Arquivo excede ${maxSizeMB}MB` }]);
      return;
    }

    const entry: UploadingFile = { file, progress: 0, status: 'uploading' };
    setUploading(prev => [...prev, entry]);

    const updateProgress = (progress: number, status: UploadingFile['status'] = 'uploading') => {
      setUploading(prev => prev.map(u => u.file === file ? { ...u, progress, status } : u));
    };

    try {
      // 1. Get presigned URL
      updateProgress(10);
      const presigned = await api.getPresignedUpload({
        projectId,
        taskId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      // 2. Upload to S3 using XMLHttpRequest for progress
      updateProgress(20);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = 20 + Math.round((e.loaded / e.total) * 60);
            updateProgress(pct);
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('PUT', presigned.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      // 3. Register in database
      updateProgress(85, 'registering');
      const registered = await api.registerFile({
        projectId,
        taskId,
        fileName: file.name,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        s3Key: presigned.s3Key,
        s3Bucket: presigned.s3Bucket,
      });

      updateProgress(100, 'done');
      onUploadComplete(registered);

      // Remove from list after 2s
      setTimeout(() => {
        setUploading(prev => prev.filter(u => u.file !== file));
      }, 2000);
    } catch (err: any) {
      updateProgress(0, 'error');
      setUploading(prev => prev.map(u => u.file === file ? { ...u, status: 'error', error: err.message } : u));
    }
  }, [projectId, taskId, maxSizeMB, onUploadComplete]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#6B9AB8] bg-[#EBF3F7]'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Upload size={24} className={`mx-auto mb-2 ${dragOver ? 'text-[#4B7B9C]' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-500">
          Arraste arquivos aqui ou <span className="text-[#3A6280] font-medium">clique para selecionar</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Máximo {maxSizeMB}MB por arquivo</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Upload progress list */}
      {uploading.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploading.map((u, i) => {
            const Icon = iconForMime(u.file.type);
            return (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <Icon size={16} className={u.status === 'error' ? 'text-red-400' : u.status === 'done' ? 'text-emerald-500' : 'text-gray-400'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium truncate">{u.file.name}</p>
                    <span className="text-[10px] text-gray-400 ml-2">{formatSize(u.file.size)}</span>
                  </div>
                  {u.status === 'error' ? (
                    <p className="text-xs text-red-500">{u.error}</p>
                  ) : u.status === 'done' ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 size={12} /> Upload completo
                    </div>
                  ) : (
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4B7B9C] rounded-full transition-all duration-300"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {u.status === 'error' && (
                  <button onClick={() => setUploading(prev => prev.filter((_, idx) => idx !== i))} className="p-1 hover:bg-gray-200 rounded">
                    <X size={12} className="text-gray-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
