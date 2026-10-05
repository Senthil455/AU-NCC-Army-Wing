'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'ta';

const dict: Record<string, { en: string; ta: string }> = {
  motto: { en: 'Unity and Discipline', ta: 'ஒற்றுமையும் ஒழுக்கமும்' },
  hero: { en: 'Anna University NCC Army Wing', ta: 'அண்ணா பல்கலைக்கழக NCC இராணுவப் பிரிவு' },
  sub: { en: 'Cadet portal — attendance, camps, certificates and one-click reports.', ta: 'கேடட் இணையதளம் — வருகை, முகாம்கள், சான்றிதழ்கள், அறிக்கைகள்.' },
  viewCadets: { en: 'View cadets', ta: 'கேடட்களைப் பார்க்க' },
  login: { en: 'Login', ta: 'உள்நுழை' },
};

const Ctx = createContext<{ lang: Lang; t: (k: string) => string; toggle: () => void }>({ lang: 'en', t: (k) => k, toggle: () => undefined });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const t = (k: string) => dict[k]?.[lang] ?? k;
  return <Ctx.Provider value={{ lang, t, toggle: () => setLang((l) => (l === 'en' ? 'ta' : 'en')) }}>{children}</Ctx.Provider>;
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
