'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { buttonPrimary, card, input } from '@/lib/ui';

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
      <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${card}`}>
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <input id="email" required type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className={input} />

        <label className="sr-only" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          required
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={input}
        />
        <button type="submit" disabled={status === 'sending'} className={buttonPrimary}>
          {status === 'sending' ? 'Ingresando…' : 'Ingresar'}
        </button>
        {status === 'error' && <p className="text-sm text-red-600">Email o contraseña incorrectos.</p>}
      </form>
    </main>
  );
}
