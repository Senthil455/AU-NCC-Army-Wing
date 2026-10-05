'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Announcement } from '../types';

export function AnnouncementBoard() {
  const [items, setItems] = useState<Announcement[]>([]);
  useEffect(() => {
    api<Announcement[]>('/announcements').then(setItems).catch(() => setItems([]));
  }, []);
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
        </li>
      ))}
    </ul>
  );
}
