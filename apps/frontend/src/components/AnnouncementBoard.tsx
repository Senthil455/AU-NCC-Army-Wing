'use client';
import { useEffect, useState } from 'react';
import type { Announcement } from '../types';
import { api } from '../lib/api';

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function AnnouncementBoard({ limit }: { limit?: number } = {}) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const query = limit ? `?limit=${limit}` : '';
    api<Announcement[]>(`/announcements${query}`)
      .then(setItems)
      .catch((e: unknown) => {
        setItems([]);
        setError(e instanceof Error ? e.message : 'Could not load announcements');
      });
  }, [limit]);

  if (items === null) return <p className="text-sm opacity-70">Loading announcements…</p>;
  if (error) return <p className="text-sm text-nccred">{error}</p>;
  if (!items.length) return <p className="text-sm opacity-70">No announcements yet.</p>;

  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id} className="card !p-3">
          <p className="font-semibold">
            {a.priority === 'URGENT' && <span className="mr-2 rounded bg-nccred px-2 py-0.5 text-xs text-white">URGENT</span>}
            {a.title}
          </p>
          <p className="text-sm">{a.body}</p>
          <p className="mt-1 text-xs opacity-60">{when(a.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
