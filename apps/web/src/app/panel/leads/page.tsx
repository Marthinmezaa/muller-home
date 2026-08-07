'use client';

import { useEffect, useState } from 'react';
import { getMyLeads } from '@/lib/api';
import type { Lead } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PanelLeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMyLeads()
      .then(setLeads)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">No se pudieron cargar tus leads.</p>;
  }
  if (!leads) {
    return <p className="opacity-70">Cargando…</p>;
  }
  if (leads.length === 0) {
    return <p className="opacity-70">Todavía no tenés leads.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {leads.map((lead) => (
        <div key={lead.id} className="rounded border border-black/10 p-4 dark:border-white/15">
          <div className="flex items-center justify-between">
            <p className="font-medium">{lead.name}</p>
            <p className="text-xs opacity-70">{formatDate(lead.createdAt)}</p>
          </div>
          <p className="text-xs opacity-70">{lead.property.title}</p>
          <p className="mt-2 text-sm">{lead.message}</p>
          <p className="mt-1 text-xs opacity-70">{lead.phone}</p>
        </div>
      ))}
    </div>
  );
}
