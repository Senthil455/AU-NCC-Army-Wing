import Link from 'next/link';
import { AnnouncementBoard } from '../src/components/AnnouncementBoard';
import { HomeHero } from '../src/components/HomeHero';

const HIGHLIGHTS = [
  {
    title: 'Attendance that survives the parade ground',
    body: 'Mark a platoon in seconds on a phone. Weak-network saves queue on the device and sync automatically. Parades lock 24 hours after they are held; an officer can still amend one, and the override is audited.',
  },
  {
    title: 'Export-first reporting',
    body: 'Filter cadets by year, department, rank, certificate or camp, pick the columns, and download Excel, CSV or PDF for Group HQ — with attendance percentage and the below-75% flag.',
  },
  {
    title: 'One roster, role-aware views',
    body: 'Officers see the whole wing, a Senior Under Officer sees their platoon, and every cadet can pull their own record. Personal contact details never reach a non-officer export.',
  },
];

/** Server component: the copy below is part of the first HTML response. */
export default function Home() {
  return (
    <div className="space-y-6">
      <HomeHero />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-bold">Latest announcements</h2>
          <div className="mt-2">
            <AnnouncementBoard limit={3} />
          </div>
          <Link href="/news" className="mt-3 inline-block text-sm underline">
            All news &amp; events →
          </Link>
        </div>
        <div className="card">
          <h2 className="font-bold">{HIGHLIGHTS[0].title}</h2>
          <p className="mt-2 text-sm">{HIGHLIGHTS[0].body}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {HIGHLIGHTS.slice(1).map((item) => (
          <div key={item.title} className="card">
            <h2 className="font-bold">{item.title}</h2>
            <p className="mt-2 text-sm">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
