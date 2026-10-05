import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from '../src/lib/auth';
import { LangProvider } from '../src/lib/i18n';
import { Navbar } from '../src/components/Navbar';
import { Footer } from '../src/components/Footer';

export const metadata: Metadata = {
  title: 'NCC Army Wing — Anna University',
  description: 'Cadet portal: database, attendance, camps, one-click Excel/PDF reports.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <LangProvider>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
            <Footer />
          </LangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
