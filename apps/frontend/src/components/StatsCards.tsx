'use client';
import { useEffect, useState } from 'react';
import type { DashboardSummary } from '../types';
import { api } from '../lib/api';

const CARDS: { key: keyof DashboardSummary; label: string; format?: (value: number) => string }[] = [
  { key: 'totalCadets', label: 'Cadets on strength' },
  { key: 'avgAttendancePct', label: 'Average attendance', format: (v) => `${v}%` },
  { key: 'lowAttendanceCount', label: 'Below threshold' },
  { key: 'totalSessions', label: 'Parades held' },
];

export function StatsCards() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardSummary>('/dashboard/summary')
      .then(setSummary)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the summary'));
  }, []);

  if (error) return <p className="card text-sm text-nccred">{error}</p>;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CARDS.map(({ key, label, format }) => {
        const value = summary?.[key];
        return (
          <div key={String(key)} className="card text-center">
            <p className="text-2xl font-bold">
              {typeof value === 'number' ? (format ? format(value) : value) : '—'}
            </p>
            <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
          </div>
        );
      })}
    </div>
  );
}
