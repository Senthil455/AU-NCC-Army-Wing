'use client';
import Link from 'next/link';
import { useLang } from '../src/lib/i18n';
import { AnnouncementBoard } from '../src/components/AnnouncementBoard';

export default function Home() {
  const { t } = useLang();
  return (
    <div className="space-y-6">
      <section className="hero card">
        <p className="text-xs tracking-widest text-khaki font-semibold">{t('motto')}</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">{t('hero')}</h1>
        <p className="mt-3 max-w-2xl text-base opacity-95">{t('sub')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cadets" className="btn !bg-khaki !text-olive-900">{t('viewCadets')}</Link>
          <Link href="/login" className="btn-secondary !border-white">{t('login')}</Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-bold">Announcements</h2>
          <div className="mt-2"><AnnouncementBoard /></div>
        </div>
        <div className="card">
          <h2 className="font-bold">Export-first reporting</h2>
          <p className="mt-2 text-sm">Filter cadets by year, department, rank, certificate, camp — choose columns — download Excel / CSV / PDF for Group HQ. Attendance % and low-attendance (&lt;75%) flags included.</p>
          <p className="mt-2 text-sm">Parade attendance works on mobile; weak-network saves queue offline and syncs later.</p>
        </div>
      </section>
    </div>
  );
}
