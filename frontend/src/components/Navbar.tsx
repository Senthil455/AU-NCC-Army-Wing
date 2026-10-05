'use client';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { LanguageToggle } from '../lib/i18n';

export function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="bg-olive-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold tracking-wide">
          <span className="text-khaki">NCC</span> · AU Army Wing
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/about">About</Link>
          <Link href="/organisation">Organisation</Link>
          <Link href="/news">News</Link>
          <Link href="/events">Events</Link>
          <Link href="/contact">Contact</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="underline">Dashboard</Link>
              <span className="opacity-70">{user.name} ({user.role})</span>
              <button onClick={logout} className="underline">Logout</button>
            </>
          ) : (
            <Link href="/login" className="underline">Login</Link>
          )}
          <LanguageToggle />
        </nav>
      </div>
      <div className="bg-nccred px-4 py-1 text-center text-xs font-semibold tracking-widest">UNITY AND DISCIPLINE · ஒற்றுமையும் ஒழுக்கமும்</div>
    </header>
  );
}
