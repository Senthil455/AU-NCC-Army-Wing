'use client';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/i18n';

/**
 * The one part of the landing page that needs the language context. Keeping it in a client
 * island lets `app/page.tsx` stay a server component, so the copy is in the initial HTML.
 */
export function HomeHero() {
  const { t } = useLang();
  const { user, loading } = useAuth();

  return (
    <section className="hero card">
      <p className="text-xs font-semibold tracking-widest text-khaki">{t('motto')}</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight">{t('hero')}</h1>
      <p className="mt-3 max-w-2xl text-base opacity-95">{t('sub')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {loading ? null : user ? (
          <>
            <Link href="/dashboard" className="btn !bg-khaki !text-olive-900">
              {t('dashboard')}
            </Link>
            <Link href="/attendance" className="btn-secondary !border-white">
              Attendance
            </Link>
          </>
        ) : (
          <>
            <Link href="/news" className="btn !bg-khaki !text-olive-900">
              News &amp; events
            </Link>
            <Link href="/login" className="btn-secondary !border-white">
              {t('login')}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
