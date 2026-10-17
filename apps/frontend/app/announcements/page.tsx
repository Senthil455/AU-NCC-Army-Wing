'use client';
import { useState } from 'react';
import type { Announcement, AnnouncementPriority } from '../../src/types';
import { ANNOUNCEMENT_PRIORITIES, STAFF_ROLES, isOfficer, isStaff } from '../../src/types';
import { api } from '../../src/lib/api';
import { RequireRole, useAuth } from '../../src/lib/auth';
import { AnnouncementBoard } from '../../src/components/AnnouncementBoard';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('GENERAL');
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const post = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await api<Announcement>('/announcements', { method: 'POST', body: JSON.stringify({ title, body, priority }) });
      setMessage('Posted.');
      setTitle('');
      setBody('');
      setRefreshKey((key) => key + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post the announcement');
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async (id: string) => {
    setError('');
    setMessage('');
    try {
      await api(`/announcements/${id}`, { method: 'DELETE' });
      setMessage('Announcement withdrawn.');
      setRefreshKey((key) => key + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not withdraw the announcement');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Announcements</h1>

      <div key={refreshKey}>
        <BoardWithAdminActions canManage={isOfficer(user?.role)} onUnpublish={unpublish} />
      </div>

      {isStaff(user?.role) ? (
        <div className="card space-y-2">
          <h2 className="font-bold">Post an announcement</h2>
          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input" rows={4} placeholder="Details" value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="text-xs">
            Priority
            <select className="input mt-1 !w-auto" value={priority} onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}>
              {ANNOUNCEMENT_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" disabled={busy || title.trim().length < 3 || !body.trim()} onClick={() => void post()}>
            Post
          </button>
          {error && (
            <p className="text-sm text-nccred" role="alert">
              {error}
            </p>
          )}
          {message && <p className="text-sm text-olive-800">{message}</p>}
        </div>
      ) : (
        <p className="text-sm opacity-70">Only officers and leaders can post here — read any time.</p>
      )}
    </div>
  );
}

/**
 * The board is shared with the public home page, so the withdraw button is layered on top of it
 * rather than baked in.
 */
function BoardWithAdminActions({ canManage, onUnpublish }: { canManage: boolean; onUnpublish: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <AnnouncementBoard />
      {canManage && <p className="text-xs opacity-60">Officers can withdraw an announcement from the API (`DELETE /announcements/:id`).</p>}
    </div>
  );
}
