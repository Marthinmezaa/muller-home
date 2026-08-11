'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvite } from '@/lib/api';
import { buttonPrimary, input } from '@/lib/ui';

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    try {
      await acceptInvite({ token, email, password, fullName });
      router.push('/panel');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="sr-only" htmlFor="fullName">
        Nombre completo
      </label>
      <input id="fullName" required placeholder="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} className={input} />

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
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className={input}
      />
      <button type="submit" disabled={status === 'sending'} className={buttonPrimary}>
        {status === 'sending' ? 'Registrando…' : 'Crear cuenta'}
      </button>
      {status === 'error' && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
