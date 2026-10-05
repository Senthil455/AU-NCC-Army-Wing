'use client';
import { useEffect, useState } from 'react';
import { api } from '../../src/lib/api';

export default function News() {
  const [items, setItems] = useState<{ id: string; title: string; body: string }[]>([]);
  useEffect(() => {
    api<typeof items>('/news').then(setItems).catch(() => setItems([]));
  }, []);
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">News & Announcements</h1>
      <ul className="mt-3 space-y-2">
        {items.map((n) => (
          <li key={n.id} className="rounded border p-3 text-sm"><p className="font-semibold">{n.title}</p><p>{n.body}</p></li>
        ))}
        {!items.length && <p className="text-sm opacity-70">Backend news feed empty — announcements board on home shows latest.</p>}
      </ul>
    </div>
  );
}
