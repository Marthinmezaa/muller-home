'use client';

import { useEffect, useState } from 'react';
import { approvePurchase, getAllPurchases, getPurchaseProofUrl, rejectPurchase } from '@/lib/api';
import { PURCHASE_STATUS_LABELS, type PackagePurchase, type PurchaseStatus } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_STYLES: Record<PurchaseStatus, string> = {
  PENDING: 'bg-brand-gold/20 text-[#8a6b0a] dark:text-brand-gold',
  APPROVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export default function PanelPagosPage() {
  const [purchases, setPurchases] = useState<PackagePurchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getAllPurchases()
      .then(setPurchases)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function handleReview(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    try {
      await (action === 'approve' ? approvePurchase(id) : rejectPurchase(id));
      setPurchases((current) =>
        current?.map((p) => (p.id === id ? { ...p, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : p)) ?? null,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleViewProof(id: string) {
    try {
      const url = await getPurchaseProofUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!purchases) {
    return <p className="opacity-70">Cargando…</p>;
  }
  if (purchases.length === 0) {
    return <p className="opacity-70">Todavía no hay compras.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {purchases.map((purchase) => (
        <div key={purchase.id} className="flex flex-col gap-2 rounded border border-black/10 p-4 dark:border-white/15">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{purchase.package.name}</p>
              <p className="text-xs opacity-70">
                {purchase.buyer.fullName} ({purchase.buyer.email}) · {formatDate(purchase.createdAt)}
              </p>
            </div>
            <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLES[purchase.status]}`}>
              {PURCHASE_STATUS_LABELS[purchase.status]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => handleViewProof(purchase.id)} className="rounded border border-black/10 px-3 py-1 dark:border-white/15">
              Ver comprobante
            </button>
            {purchase.status === 'PENDING' && (
              <>
                <button
                  onClick={() => handleReview(purchase.id, 'approve')}
                  disabled={busyId === purchase.id}
                  className="rounded bg-brand-navy px-3 py-1 text-white disabled:opacity-50"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleReview(purchase.id, 'reject')}
                  disabled={busyId === purchase.id}
                  className="rounded border border-black/10 px-3 py-1 dark:border-white/15"
                >
                  Rechazar
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
