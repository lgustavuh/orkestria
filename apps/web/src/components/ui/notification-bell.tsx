'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Notification {
  id: string; type: string; title: string; message: string;
  isRead: boolean; createdAt: string; data?: any;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await api.getNotifications({ limit: '15' });
      setNotifs(res.data || []);
      setUnread(res.unreadCount || 0);
    } catch {}
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (n: Notification) => {
    if (!n.isRead) { try { await api.markNotificationRead(n.id); } catch {} }
    setOpen(false);
    if (n.data?.taskId) router.push(`/dashboard/tasks/${n.data.taskId}`);
    else if (n.data?.projectId) router.push(`/dashboard/projects/${n.data.projectId}`);
    load();
  };

  const markAllRead = async () => {
    try { await api.fetch('/notifications/read-all', { method: 'PATCH' }); load(); } catch {}
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 transition-colors" style={{ borderRadius: '8px' }}>
        <Bell size={17} style={{ color: 'var(--fg-muted)' }} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-white text-[9px] font-bold px-0.5"
            style={{ background: '#ef4444' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-80 z-50 overflow-hidden"
          style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
            <h3 className="text-[13px] font-medium" style={{ color: 'var(--fg)' }}>Notificações</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                <Check size={11} /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px]" style={{ color: 'var(--fg-hint)' }}>Sem notificações</div>
            ) : notifs.map(n => (
              <button key={n.id} onClick={() => handleClick(n)}
                className="w-full text-left px-4 py-3 transition-colors flex gap-2.5"
                style={{
                  borderBottom: '0.5px solid var(--border)',
                  background: !n.isRead ? 'var(--brand-light)' : 'transparent',
                }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--brand)' }} />}
                    <p className="text-[12px] truncate" style={{ color: 'var(--fg)', fontWeight: !n.isRead ? 500 : 400 }}>{n.title}</p>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--fg-hint)' }}>{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.message && <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--fg-muted)' }}>{n.message}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
