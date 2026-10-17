'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttendanceSession, AttendanceStatus, Cadet, QueuedAttendanceMark, SessionType } from '../../src/types';
import { ATTENDANCE_STATUSES, SESSION_TYPES, isLowAttendance } from '../../src/types';
import { api, apiDownload } from '../../src/lib/api';
import { RequireRole, useAuth } from '../../src/lib/auth';
import { STAFF_ROLES, isOfficer } from '../../src/types';

const QUEUE_KEY = 'ncc_att_queue';
const today = () => new Date().toISOString().slice(0, 10);

function readQueue(): QueuedAttendanceMark[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(raw) ? (raw as QueuedAttendanceMark[]) : [];
  } catch {
    return [];
  }
}

const writeQueue = (items: QueuedAttendanceMark[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(items));

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AttendancePage() {
  const { user } = useAuth();
  const officer = isOfficer(user?.role);

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeId, setActiveId] = useState('');
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [queued, setQueued] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ date: today(), type: 'DRILL' as SessionType, platoon: '', location: '' });

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? null, [sessions, activeId]);

  const loadSessions = useCallback(async () => {
    const rows = await api<AttendanceSession[]>('/attendance/sessions');
    setSessions(rows);
    return rows;
  }, []);

  /** The roster of *this* parade: a platoon session must never list the whole wing. */
  const loadRoster = useCallback(async (session: AttendanceSession | null) => {
    const params = new URLSearchParams({ pageSize: '200' });
    if (session?.platoon) params.set('platoon', session.platoon);
    const data = await api<{ data: Cadet[] }>(`/cadets?${params.toString()}`);
    setCadets(data.data);
    setMarks({});
  }, []);

  const syncQueue = useCallback(async () => {
    const pending = readQueue();
    if (!pending.length) return 0;
    const unsent: QueuedAttendanceMark[] = [];
    for (const item of pending) {
      try {
        await api(`/attendance/sessions/${item.sessionId}/mark`, { method: 'POST', body: JSON.stringify(item.payload) });
      } catch {
        unsent.push(item);
      }
    }
    writeQueue(unsent);
    setQueued(unsent.length);
    return pending.length - unsent.length;
  }, []);

  // First load: sessions, the queue depth, and a sync attempt if we are online.
  useEffect(() => {
    setQueued(readQueue().length);
    loadSessions()
      .then(async (rows) => {
        if (rows[0]) {
          setActiveId(rows[0].id);
          await loadRoster(rows[0]);
        }
        if (navigator.onLine) {
          const synced = await syncQueue();
          if (synced) setMessage(`Synced ${synced} offline mark(s).`);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load parades'));
  }, [loadRoster, loadSessions, syncQueue]);

  // Weak-network parade ground: finish the queued marks as soon as the device is back online.
  useEffect(() => {
    const onOnline = () => {
      void syncQueue().then((synced) => {
        if (synced) setMessage(`Synced ${synced} offline mark(s).`);
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [syncQueue]);

  const selectSession = async (id: string) => {
    setActiveId(id);
    setMessage('');
    setError('');
    try {
      await loadRoster(sessions.find((s) => s.id === id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the roster');
    }
  };

  const submit = async (markAllPresent: boolean) => {
    setError('');
    setMessage('');
    if (!activeId) {
      setError('Pick or create a parade first.');
      return;
    }

    const exceptions = Object.entries(marks).map(([cadetId, status]) => ({ cadetId, status }));
    if (!markAllPresent && !exceptions.length) {
      setError('Tick at least one cadet, or use “Everyone present”.');
      return;
    }

    const payload = markAllPresent ? { markAllPresent: true, records: exceptions } : { records: exceptions };

    if (!navigator.onLine) {
      const queue = readQueue();
      queue.push({ sessionId: activeId, payload, at: Date.now() });
      writeQueue(queue);
      setQueued(queue.length);
      setMessage('Offline — saved on this device. It syncs automatically once you are back online.');
      return;
    }

    setBusy(true);
    try {
      const result = await api<{ marked: number; overrodeLock: boolean }>(`/attendance/sessions/${activeId}/mark`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMessage(
        `Marked ${result.marked} cadet(s)${result.overrodeLock ? ' — a locked parade was amended, recorded as an officer override.' : ''}`,
      );
      await loadRoster(active);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Marking failed');
    } finally {
      setBusy(false);
    }
  };

  const createSession = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const created = await api<AttendanceSession>('/attendance/sessions', {
        method: 'POST',
        body: JSON.stringify({
          date: draft.date,
          type: draft.type,
          ...(draft.platoon.trim() ? { platoon: draft.platoon.trim() } : {}),
          ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
        }),
      });
      const rows = await loadSessions();
      const next = rows.find((s) => s.id === created.id) ?? created;
      setActiveId(next.id);
      await loadRoster(next);
      setMessage('Parade created — mark the roster below.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the parade');
    } finally {
      setBusy(false);
    }
  };

  const report = async (format: 'xlsx' | 'pdf') => {
    setError('');
    setMessage('');
    try {
      const info = await apiDownload(`/attendance/report.${format}`, `attendance-report-${today()}.${format}`);
      setMessage(`Report downloaded${info.rows !== null ? ` (${info.rows} row(s))` : ''}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Report download failed');
    }
  };

  return (
    <RequireRole roles={[...STAFF_ROLES]}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Attendance</h1>
          {queued > 0 && (
            <span className="rounded bg-nccred px-2 py-0.5 text-xs font-semibold text-white" role="status">
              {queued} mark(s) waiting to sync
            </span>
          )}
        </div>

        <div className="card flex flex-wrap items-end gap-3">
          <label className="text-xs">
            Parade
            <select className="input mt-1 !w-auto" value={activeId} onChange={(e) => void selectSession(e.target.value)}>
              {!sessions.length && <option value="">No parade recorded yet</option>}
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatDate(session.date)} · {session.type}
                  {session.platoon ? ` · ${session.platoon}` : ' · all platoons'}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" disabled={busy || !cadets.length} onClick={() => void submit(false)}>
            Save ticks
          </button>
          <button className="btn-secondary" disabled={busy || !cadets.length} onClick={() => void submit(true)}>
            Everyone present
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => void report('xlsx')}>
            Report Excel
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => void report('pdf')}>
            Report PDF
          </button>
        </div>

        {(message || error) && (
          <p className={error ? 'text-sm text-nccred' : 'text-sm text-olive-800'} role={error ? 'alert' : 'status'}>
            {error || message}
          </p>
        )}

        <div className="card">
          <h2 className="font-bold">
            {active ? `${formatDate(active.date)} · ${active.type}${active.platoon ? ` · ${active.platoon}` : ' · all platoons'}` : 'Roster'}
          </h2>
          <p className="mb-2 text-xs opacity-70">
            Leave a cadet unticked and use “Everyone present”, or tick only the exceptions. A parade can be edited for
            {' '}24 hours; after that an officer has to amend it (the change is logged).
          </p>
          <div className="divide-y">
            {cadets.map((cadet) => (
              <div key={cadet.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {cadet.name} <span className="opacity-60">({cadet.regdNo})</span>
                  <span className={isLowAttendance(cadet.attendancePct) ? 'ml-2 text-xs font-semibold text-nccred' : 'ml-2 text-xs opacity-60'}>
                    {cadet.attendancePct}%
                  </span>
                </span>
                <select
                  className="input !w-36"
                  aria-label={`Attendance for ${cadet.name}`}
                  value={marks[cadet.id] ?? ''}
                  onChange={(e) => {
                    const value = e.target.value as AttendanceStatus | '';
                    setMarks((current) => {
                      const next = { ...current };
                      if (value) next[cadet.id] = value;
                      else delete next[cadet.id];
                      return next;
                    });
                  }}
                >
                  <option value="">—</option>
                  {ATTENDANCE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {!cadets.length && <p className="py-3 text-sm opacity-70">No cadets on this roster.</p>}
          </div>
        </div>

        <div className="card space-y-2">
          <h2 className="font-bold">New parade</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              Date
              <input type="date" className="input mt-1 !w-auto" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </label>
            <label className="text-xs">
              Type
              <select className="input mt-1 !w-auto" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as SessionType })}>
                {SESSION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Platoon
              <input
                className="input mt-1 !w-40"
                placeholder={officer ? 'blank = whole wing' : 'your platoon'}
                value={draft.platoon}
                onChange={(e) => setDraft({ ...draft, platoon: e.target.value })}
              />
            </label>
            <label className="text-xs">
              Location
              <input className="input mt-1" placeholder="Kottur ground" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </label>
            <button className="btn" disabled={busy} onClick={() => void createSession()}>
              Create parade
            </button>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
