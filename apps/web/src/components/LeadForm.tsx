'use client';

import { useState } from 'react';
import { createLead } from '@/lib/api';

function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export function LeadForm({
  propertyId,
  advisorPhone,
  advisorName,
}: {
  propertyId: string;
  advisorPhone: string;
  advisorName: string;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    try {
      await createLead(propertyId, { name, phone, message });
      window.open(whatsappLink(advisorPhone, `Hola ${advisorName}, soy ${name}. ${message}`), '_blank');
      setStatus('idle');
      setName('');
      setPhone('');
      setMessage('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded border border-black/10 p-4">
      <h2 className="font-semibold">Contactar a {advisorName}</h2>
      <input
        required
        placeholder="Tu nombre"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="rounded border border-black/10 px-3 py-2"
      />
      <input
        required
        placeholder="Tu teléfono"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        className="rounded border border-black/10 px-3 py-2"
      />
      <textarea
        required
        placeholder="Contame qué te interesa de la propiedad"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        className="rounded border border-black/10 px-3 py-2"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-fit rounded bg-brand-navy px-4 py-2 text-white disabled:opacity-50"
      >
        {status === 'sending' ? 'Enviando…' : 'Enviar y abrir WhatsApp'}
      </button>
      {status === 'error' && <p className="text-sm text-red-600">No se pudo enviar el mensaje, intentá de nuevo.</p>}
    </form>
  );
}
