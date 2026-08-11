'use client';

import { useState } from 'react';
import { createLead } from '@/lib/api';
import { buttonPrimary, card, input } from '@/lib/ui';
import { Field } from './Field';

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
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${card}`}>
      <h2 className="text-lg font-semibold tracking-tight">Contactar a {advisorName}</h2>

      <Field label="Tu nombre" htmlFor="lead-name">
        <input id="lead-name" required placeholder="Tu nombre" value={name} onChange={(event) => setName(event.target.value)} className={input} />
      </Field>

      <Field label="Tu teléfono" htmlFor="lead-phone">
        <input id="lead-phone" required placeholder="Tu teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} className={input} />
      </Field>

      <Field label="Mensaje" htmlFor="lead-message">
        <textarea
          id="lead-message"
          required
          placeholder="Contame qué te interesa de la propiedad"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          className={input}
        />
      </Field>
      <button type="submit" disabled={status === 'sending'} className={`w-fit ${buttonPrimary}`}>
        {status === 'sending' ? 'Enviando…' : 'Enviar y abrir WhatsApp'}
      </button>
      {status === 'error' && <p className="text-sm text-red-600">No se pudo enviar el mensaje, intentá de nuevo.</p>}
    </form>
  );
}
