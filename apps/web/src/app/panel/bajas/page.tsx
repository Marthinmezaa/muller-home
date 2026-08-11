'use client';

import { useEffect, useState } from 'react';
import { approveDeletionRequest, getPendingDeletionRequests, rejectDeletionRequest } from '@/lib/api';
import type { DeletionRequest } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PanelBajasPage() {
  const [requests, setRequests] = useState<DeletionRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getPendingDeletionRequests()
      .then(setRequests)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function handleReview(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    try {
      await (action === 'approve' ? approveDeletionRequest(id) : rejectDeletionRequest(id));
      setRequests((current) => current?.filter((request) => request.id !== id) ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!requests) {
    return <p className="opacity-70">Cargando…</p>;
  }
  if (requests.length === 0) {
    return <p className="opacity-70">No hay solicitudes de baja pendientes.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {requests.map((request) => (
        <div key={request.id} className="flex items-center justify-between rounded border border-black/10 p-4 dark:border-white/15">
          <div>
            <p className="font-medium">{request.property.title}</p>
            <p className="text-xs opacity-70">
              Pedida por {request.requestedBy.fullName} el {formatDate(request.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleReview(request.id, 'approve')}
              disabled={busyId === request.id}
              className="rounded bg-brand-navy px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              onClick={() => handleReview(request.id, 'reject')}
              disabled={busyId === request.id}
              className="rounded border border-black/10 px-3 py-1 text-sm dark:border-white/15"
            >
              Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
