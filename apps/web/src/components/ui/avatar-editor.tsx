'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface Props {
  file: File;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

const SIZE = 256;

export function AvatarEditor({ file, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  // Load image
  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(image.src);
  }, [file]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.translate(SIZE / 2 + offset.x, SIZE / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const scale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [img, zoom, rotation, offset]);

  useEffect(() => { draw(); }, [draw]);

  // Mouse drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };

  const onMouseUp = () => { dragRef.current.active = false; };

  // Touch drag handlers
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    dragRef.current = { active: true, startX: t.clientX, startY: t.clientY, origX: offset.x, origY: offset.y };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current.active) return;
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => { if (blob) onSave(blob); }, 'image/jpeg', 0.9);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <canvas ref={canvasRef} width={SIZE} height={SIZE}
          className="rounded-full border-2 border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing touch-none"
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}
        />
      </div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ZoomOut size={16} className="dark:text-gray-300" />
        </button>
        <input type="range" min="50" max="300" value={zoom * 100}
          onChange={e => setZoom(Number(e.target.value) / 100)} className="w-32 accent-indigo-600" />
        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ZoomIn size={16} className="dark:text-gray-300" />
        </button>
        <button onClick={() => setRotation(r => r + 90)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <RotateCw size={16} className="dark:text-gray-300" />
        </button>
      </div>
      <p className="text-xs text-center text-gray-400">Arraste para posicionar</p>
      <div className="flex justify-center gap-2">
        <button onClick={handleSave} className="btn-primary text-sm">Salvar avatar</button>
        <button onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
      </div>
    </div>
  );
}
