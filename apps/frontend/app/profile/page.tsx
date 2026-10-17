'use client';
import { useEffect, useState } from 'react';
import type { Cadet } from '../../src/types';
import { isLowAttendance } from '../../src/types';
import { ApiError, api } from '../../src/lib/api';
import { RequireRole } from '../../src/lib/auth';

const FIELDS: [keyof Cadet, string][] = [
  ['regdNo', 'Register number'],
  ['nccRegimentalNo', 'NCC regimental number'],
  ['rank', 'Rank'],
  ['department', 'Department'],
  ['year', 'Year'],
  ['batch', 'Batch'],
  ['platoon', 'Platoon'],
  ['bloodGroup', 'Blood group'],
  ['certificate', 'Certificate'],
  ['enrollmentStatus', 'Enrolment status'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['parentContact', 'Parent contact'],
  ['address', 'Address'],
];

export default function ProfilePage() {
  const [cadet, setCadet] = useState<Cadet | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unlinked' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Cadet>('/cadets/me')
      .then((data) => {
        setCadet(data);
        setState('ready');
      })
      .catch((e: unknown) => {
        // A login without a linked cadet record is a normal state, not an error to shout about.
        if (e instanceof ApiError && e.status === 404) setState('unlinked');
        else {
          setError(e instanceof Error ? e.message : 'Could not load your record');
          setState('error');
        }
      });
  }, []);

  return (
    <RequireRole roles={['CADET', 'LEADER_SUO', 'OFFICER_ANO_CTO', 'SUPER_ADMIN']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My record</h1>
        <p className="text-sm opacity-70">
          Everything the unit holds about you, including the contact fields that are hidden from staff lists. Ask an
          officer if something is wrong — only they can edit it.
        </p>

        {state === 'loading' && <p className="card text-sm">Loading…</p>}
        {state === 'unlinked' && (
          <p className="card text-sm">
            No cadet record is linked to this login yet. If you have already enrolled, ask the office to link your
            register number.
          </p>
        )}
        {state === 'error' && (
          <p className="card text-sm text-nccred" role="alert">
            {error}
          </p>
        )}

        {state === 'ready' && cadet && (
          <>
            <div className="card">
              <p className="text-sm opacity-70">Attendance</p>
              <p className={`text-3xl font-bold ${isLowAttendance(cadet.attendancePct) ? 'text-nccred' : ''}`}>
                {cadet.attendancePct}%
              </p>
              {isLowAttendance(cadet.attendancePct) && (
                <p className="text-sm text-nccred">
                  Below the 75% threshold for certificate eligibility — check the parade register with your platoon
                  leader.
                </p>
              )}
            </div>

            <div className="card">
              <h2 className="font-bold">{cadet.name}</h2>
              <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {FIELDS.map(([key, label]) => (
                  <div key={String(key)} className="text-sm">
                    <dt className="opacity-60">{label}</dt>
                    <dd>{cadet[key] === null || cadet[key] === undefined || cadet[key] === '' ? '—' : String(cadet[key])}</dd>
                  </div>
                ))}
                <div className="text-sm">
                  <dt className="opacity-60">Data consent (DPDP)</dt>
                  <dd>{cadet.consentGiven ? `Given${cadet.consentAt ? ` on ${new Date(cadet.consentAt).toLocaleDateString('en-IN')}` : ''}` : 'Not recorded'}</dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </div>
    </RequireRole>
  );
}
