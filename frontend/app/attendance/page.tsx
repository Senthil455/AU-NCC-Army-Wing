'use client';
import { useEffect, useState } from 'react';
import { api, API_BASE } from '../../src/lib/api';
import { RequireRole } from '../../src/lib/auth';
import type { AttendanceSession, Cadet } from '../../src/types';

const STATUSES = ['PRESENT', 'ABSENT', 'ON_DUTY', 'LEAVE', 'MEDICAL'];

export default function AttendancePage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [active, setActive] = useState('');
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<AttendanceSession[]>('/attendance/sessions').then((s) => { setSessions(s); if (s[0]) setActive(s[0].id); }).catch(() => undefined);
    api<{ data: Cadet[] }>('/cadets?pageSize=200').then((d) => setCadets(d.data)).catch(() => undefined);
  }, []);

  const submit = async () => {
    setMsg('');
    const records = Object.entries(marks).map(([cadetId, status]) => ({ cadetId, status }));
    const payload = { records, markAllPresent: !records.length || undefined };
    // Offline queue: parade ground weak network → store, sync later
    if (!navigator.onLine) {
      const q = JSON.parse(localStorage.getItem('ncc_att_queue') ?? '[]');
      q.push({ sessionId: active, payload, at: Date.now() });
      localStorage.setItem('ncc_att_queue', JSON.stringify(q));
      setMsg('Offline — saved to queue, will sync when online.');
      return;
    }
    try {
      await api(`/attendance/sessions/${active}/mark`, { method: 'POST', body: JSON.stringify(payload) });
      setMsg(`Marked ${records.length || 'all present'} ✓`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Marking failed');
    }
  };

  return (
    <RequireRole roles={['SUPER_ADMIN', 'OFFICER_ANO_CTO', 'LEADER_SUO']}>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Attendance (mobile-first)</h1>
        <div className="card flex flex-wrap items-center gap-2">
          <select className="input !w-auto" value={active} onChange={(e) => setActive(e.target.value)}>
            {sessions.map((s) => <option key={s.id} value={s.id}>{new Date(s.date).toLocaleDateString('en-IN')} · {s.type}</option>)}
          </select>
          <button className="btn" onClick={submit}>Submit</button>
          <a className="btn-secondary" href={`${API_BASE}/attendance/report.xlsx`} target="_blank" rel="noreferrer">Report Excel</a>
          {msg && <span className="text-sm">{msg}</span>}
        </div>
        <div className="card">
          {cadets.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b py-2 text-sm">
              <span>{c.name} <span className="opacity-60">({c.regdNo})</span></span>
              <select className="input !w-32" value={marks[c.id] ?? ''} onChange={(e) => setMarks({ ...marks, [c.id]: e.target.value })}>
                <option value="">—</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
          {!cadets.length && <p className="text-sm opacity-70">No cadets loaded — login as officer/leader.</p>}
        </div>
      </div>
    </RequireRole>
  );
}
