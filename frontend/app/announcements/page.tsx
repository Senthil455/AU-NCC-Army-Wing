'use client';
import { useState } from 'react';
import { api } from '../../src/lib/api';
import { RequireRole } from '../../src/lib/auth';
import { AnnouncementBoard } from '../../src/components/AnnouncementBoard';

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('GENERAL');
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(0);

  return (
    <RequireRole roles={['SUPER_ADMIN', 'OFFICER_ANO_CTO', 'LEADER_SUO', 'CADET']}>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <div key={tick}><AnnouncementBoard /></div>
        <div className="card space-y-2">
          <h2 className="font-bold">Post (officer / leader)</h2>
          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input" placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option>GENERAL</option>
            <option>URGENT</option>
          </select>
          <button
            className="btn"
            onClick={async () => {
              try {
                await api('/announcements', { method: 'POST', body: JSON.stringify({ title, body, priority }) });
                setMsg('Posted ✓');
                setTitle('');
                setBody('');
                setTick((t) => t + 1);
              } catch (e) {
                setMsg(e instanceof Error ? e.message : 'Post failed (role-gated)');
              }
            }}
          >
            Post
          </button>
          {msg && <p className="text-sm">{msg}</p>}
        </div>
      </div>
    </RequireRole>
  );
}
