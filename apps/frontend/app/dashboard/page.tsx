'use client';
import { RequireRole, useAuth } from '../../src/lib/auth';
import { StatsCards } from '../../src/components/StatsCards';
import { AnnouncementBoard } from '../../src/components/AnnouncementBoard';
import Link from 'next/link';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <RequireRole roles={['SUPER_ADMIN', 'OFFICER_ANO_CTO', 'LEADER_SUO', 'CADET']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard — {user?.role}</h1>
        <StatsCards />
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['/cadets', 'Cadet database + export'],
            ['/attendance', 'Attendance marking'],
            ['/announcements', 'Announcements'],
            ['/events', 'Camps & events'],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="card font-semibold hover:bg-olive-100">{label}</Link>
          ))}
        </div>
        <div className="card">
          <h2 className="font-bold">Latest announcements</h2>
          <div className="mt-2"><AnnouncementBoard /></div>
        </div>
      </div>
    </RequireRole>
  );
}
