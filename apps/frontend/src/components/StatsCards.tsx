'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function StatsCards() {
  const [s, setS] = useState<{ totalCadets?: number; avgAttendancePct?: number; lowAttendanceCount?: number }>({});
  useEffect(() => {
    api<typeof s>('/dashboard/summary').then(setS).catch(() => undefined);
  }, []);
  const cards = [
    ['Total cadets', s.totalCadets ?? '—'],
    ['Avg attendance', s.avgAttendancePct !== undefined ? `${s.avgAttendancePct}%` : '—'],
    ['Below 75%', s.lowAttendanceCount ?? '—'],
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(([k, v]) => (
        <div key={k} className="card text-center">
          <p className="text-2xl font-bold">{v}</p>
          <p className="text-xs uppercase tracking-wide opacity-70">{k}</p>
        </div>
      ))}
    </div>
  );
}
