'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [id, setId] = useState('ano@annauniv.edu');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="mx-auto max-w-sm card">
      <h1 className="text-xl font-bold">Login</h1>
      <p className="text-xs opacity-70">AU email or Regd No. + password. Juniors/seniors use distinct IDs for role switching.</p>
      <input className="input mt-3" placeholder="Email or Regd No." value={id} onChange={(e) => setId(e.target.value)} />
      <input className="input mt-2" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
      {error && <p className="mt-2 text-sm text-nccred">{error}</p>}
      <button
        className="btn mt-3 w-full"
        onClick={async () => {
          try {
            await login(id, pw);
            router.push('/dashboard');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Login failed');
          }
        }}
      >
        Login
      </button>
    </div>
  );
}
