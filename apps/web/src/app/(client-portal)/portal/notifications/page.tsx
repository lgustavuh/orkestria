'use client';

import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';

export default function PortalNotificationsPage() {
  const [notifs, setNotifs] = useState<any>(null);

  const headers = () => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json',
  });

  const load = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/portal/notifications`, { headers: headers() })
      .then(r => r.json()).then(setNotifs);
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
      method: 'PATCH', headers: headers(),
    });
    load();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Notificações</h2>
        {notifs?.data?.some((n: any) => !n.isRead) && (
          <button onClick={markAllRead} className="btn-secondary text-xs">
            <Check size={14} className="mr-1" /> Marcar todas como lidas
          </button>
        )}
      </div>

      {!notifs ? (
        <div className="text-gray-400 text-sm py-8 text-center">Carregando...</div>
      ) : notifs.data?.length === 0 ? (
        <div className="card text-center py-12">
          <Bell size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma notificação</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.data.map((n: any) => (
            <div key={n.id} className={`card flex items-start gap-3 ${!n.isRead ? 'bg-indigo-50/30 border-indigo-100' : ''}`}>
              {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />}
              <div className="flex-1">
                <p className={`text-sm ${!n.isRead ? 'font-medium' : 'text-gray-600'}`}>{n.title}</p>
                {n.message && <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
