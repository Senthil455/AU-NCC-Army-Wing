'use client';
import Link from 'next/link';
import { RequireRole, useAuth } from '../../src/lib/auth';
import { StatsCards } from '../../src/components/StatsCards';
import { AnnouncementBoard } from '../../src/components/AnnouncementBoard';
import { STAFF_ROLES, isStaff } from '../../src/types';

const STAFF_LINKS: [string, string][] = [
  ['/cadets', 'Cadet database & exports'],
  ['/attendance', 'Attendance marking & reports'],
  ['/announcements', 'Announcements'],
  ['/events', 'Camps & events'],
];

const CADET_LINKS: [string, string][] = [
  ['/profile', 'My record & attendance'],
  ['/announcements', 'Announcements'],
  ['/news', 'News'],
  ['/events', 'Camps & events'],
];

export default function Dashboard() {
  const { user } = useAuth();
  const staff = isStaff(user?.role);
  const links = staff ? STAFF_LINKS : CADET_LINKS;

  return (
    <RequireRole roles={[...STAFF_ROLES, 'CADET']}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
          <span className="text-sm opacity-70">{user?.role.replace(/_/g, ' ')}</span>
        </div>

        {staff ? (
          <StatsCards />
        ) : (
          <p className="card text-sm">
            Your attendance, certificate progress and contact details are on{' '}
            <Link href="/profile" className="underline">
              your profile
            </Link>
            . Parades and camps are announced on the announcements board.
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="card font-semibold hover:bg-olive-100">
              {label}
            </Link>
          ))}
        </div>

        <div className="card">
          <h2 className="font-bold">Latest announcements</h2>
          <div className="mt-2">
            <AnnouncementBoard limit={5} />
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
