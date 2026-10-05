'use client';
import { useEffect, useState } from 'react';
import { api } from '../../src/lib/api';

export default function Events() {
  const [items, setItems] = useState<{ id: string; title: string; description: string; venue?: string }[]>([]);
  useEffect(() => {
    api<typeof items>('/events').then(setItems).catch(() => setItems([]));
  }, []);
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Events & Camps calendar</h1>
      <p className="mt-1 text-sm opacity-70">ATC · RDC selection · CATC · TSC · Adventure · Blood donation · Tree plantation</p>
      <ul className="mt-3 space-y-2">
        {items.map((e) => (
          <li key={e.id} className="rounded border p-3 text-sm"><p className="font-semibold">{e.title}</p><p>{e.description}</p></li>
        ))}
        {!items.length && <p className="text-sm opacity-70">No upcoming events posted yet.</p>}
      </ul>
    </div>
  );
}
