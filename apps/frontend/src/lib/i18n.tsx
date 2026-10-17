'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Lang = 'en' | 'ta';

const STORAGE_KEY = 'ncc_lang';

const dict: Record<string, { en: string; ta: string }> = {
  motto: { en: 'Unity and Discipline', ta: 'ஒற்றுமையும் ஒழுக்கமும்' },
  hero: { en: 'Anna University NCC Army Wing', ta: 'அண்ணா பல்கலைக்கழக NCC இராணுவப் பிரிவு' },
  sub: { en: 'Cadet portal — attendance, camps, certificates and one-click reports.', ta: 'கேடட் இணையதளம் — வருகை, முகாம்கள், சான்றிதழ்கள், அறிக்கைகள்.' },
  viewCadets: { en: 'Cadet database', ta: 'கேடட் தரவுத்தளம்' },
  login: { en: 'Login', ta: 'உள்நுழை' },
  dashboard: { en: 'Dashboard', ta: 'முகப்புப் பலகை' },
  myProfile: { en: 'My profile', ta: 'என் விவரம்' },
  loading: { en: 'Loading…', ta: 'ஏற்றுகிறது…' },
};

const Ctx = createContext<{ lang: Lang; t: (k: string) => string; toggle: () => void }>({
  lang: 'en',
  t: (k) => k,
  toggle: () => undefined,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  // Restore the last choice after hydration (reading localStorage during render breaks SSR).
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ta') setLang(stored);
  }, []);

  const toggle = () => {
    setLang((current) => {
      const next: Lang = current === 'en' ? 'ta' : 'en';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  const t = (key: string) => dict[key]?.[lang] ?? key;

  return <Ctx.Provider value={{ lang, t, toggle }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

export function LanguageToggle() {
  const { lang, toggle } = useLang();
  return (
    <button onClick={toggle} className="btn-secondary !px-3 !py-1 text-xs" aria-label="Toggle language">
      {lang === 'en' ? 'தமிழ்' : 'English'}
    </button>
  );
}
