'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    try {
      await login(email, password);
      router.push('/panel');
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded border border-black/10 px-3 py-2 dark:border-white/15"
        />
        <input
          required
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded border border-black/10 px-3 py-2 dark:border-white/15"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="rounded bg-[#3B3A72] px-4 py-2 text-white disabled:opacity-50"
        >
          {status === 'sending' ? 'Ingresando…' : 'Ingresar'}
        </button>
        {status === 'error' && <p className="text-sm text-red-600">Email o contraseña incorrectos.</p>}
      </form>
    </main>
  );
}
