'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    api.getProjects({ limit: '100' }).then(async (res: any) => {
      const all: any[] = [];
      for (const p of (res.data || []).slice(0, 20)) {
        try {
          const t = await api.getTasks(p.id);
          all.push(...(t.data || t || []).filter((task: any) => task.dueDate).map((task: any) => ({ ...task, projectName: p.name, clientName: p.client?.name })));
        } catch {}
      }
      setTasks(all);
    });
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = useMemo(() => {
    const d: { day: number; isCurrentMonth: boolean; date: Date }[] = [];
    // Previous month padding
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) d.push({ day: prevDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevDays - i) });
    // Current month
    for (let i = 1; i <= daysInMonth; i++) d.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    // Next month padding
    const remaining = 42 - d.length;
    for (let i = 1; i <= remaining; i++) d.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    return d;
  }, [year, month, firstDay, daysInMonth]);

  const getTasksForDay = (date: Date) => {
    const ds = date.toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate?.split('T')[0] === ds);
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isPast = (d: Date) => d < today && !isToday(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold dark:text-white">Calendário</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft size={18} className="dark:text-gray-300" /></button>
          <span className="text-sm font-medium dark:text-white min-w-[140px] text-center">{monthNames[month]} {year}</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight size={18} className="dark:text-gray-300" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-xs">Hoje</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {dayNames.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dayTasks = getTasksForDay(d.date);
            return (
              <div key={i} className={`min-h-[80px] md:min-h-[100px] p-1 border-b border-r border-gray-100 dark:border-gray-800 ${
                !d.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : ''
              } ${isToday(d.date) ? 'bg-[#EBF3F7]/50 dark:bg-[#1E2F3A]/10' : ''}`}>
                <div className={`text-xs font-medium mb-1 px-1 ${
                  isToday(d.date) ? 'text-[#3A6280] dark:text-[#6B9AB8]' : !d.isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'
                }`}>
                  {isToday(d.date) ? <span className="bg-[#4B7B9C] text-white rounded-full w-5 h-5 inline-flex items-center justify-center">{d.day}</span> : d.day}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(t => (
                    <Link key={t.id} href={`/dashboard/tasks/${t.id}`}
                      className={`block text-[10px] leading-tight px-1 py-0.5 rounded ${
                        t.status === 'DONE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 line-through'
                        : isPast(d.date) ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-[#D6E7EF] dark:bg-[#1E2F3A]/30 text-[#2A3F4E] dark:text-[#6B9AB8]'
                      }`}>
                      {t.clientName && <span className="block text-[8px] font-bold opacity-70 truncate">{t.clientName}</span>}
                      <span className="truncate block">{t.title}</span>
                    </Link>
                  ))}
                  {dayTasks.length > 3 && <p className="text-[9px] text-gray-400 px-1">+{dayTasks.length - 3} mais</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
