'use client';

import { useEffect, useState } from 'react';
import { getMyPurchases, getPackages, purchasePackage, resendPurchaseProof } from '@/lib/api';
import { BILLING_TYPE_LABELS, PURCHASE_STATUS_LABELS, type MyPurchase, type Package, type PurchaseStatus } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_STYLES: Record<PurchaseStatus, string> = {
  PENDING: 'bg-brand-gold/20 text-[#8a6b0a]',
  APPROVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

/** Formulario de subida de comprobante, compartido entre "comprar" y "reenviar". */
function ProofForm({ busy, onSubmit }: { busy: boolean; onSubmit: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <button
        disabled={!file || busy}
        onClick={() => file && onSubmit(file)}
        className="rounded bg-brand-navy px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {busy ? 'Enviando…' : 'Confirmar'}
      </button>
    </div>
  );
}

export default function PanelComprarPage() {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [purchases, setPurchases] = useState<MyPurchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openPackageId, setOpenPackageId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPackages()
      .then(setPackages)
      .catch((err: Error) => setError(err.message));
    getMyPurchases()
      .then(setPurchases)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function handleBuy(packageId: string, file: File) {
    setBusy(true);
    try {
      const purchase = await purchasePackage(packageId, file);
      setPurchases((current) => [purchase, ...(current ?? [])]);
      setOpenPackageId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(purchaseId: string, file: File) {
    setBusy(true);
    try {
      const updated = await resendPurchaseProof(purchaseId, file);
      setPurchases((current) => current?.map((p) => (p.id === purchaseId ? updated : p)) ?? null);
      setResendingId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Catálogo</h2>
        {!packages && <p className="opacity-70">Cargando…</p>}
        {packages?.length === 0 && <p className="opacity-70">No hay paquetes disponibles.</p>}
        {packages?.map((pkg) => (
          <div key={pkg.id} className="flex flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{pkg.name}</p>
                <p className="text-xs opacity-70">
                  {BILLING_TYPE_LABELS[pkg.billingType]} · {pkg.propertiesQuota} propiedades · {pkg.productionsQuota} producciones
                  {pkg.maxAdvisors > 1 ? ` · hasta ${pkg.maxAdvisors} asesores` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium">Gs. {Number(pkg.price).toLocaleString('es-PY')}</p>
                <button
                  onClick={() => setOpenPackageId(openPackageId === pkg.id ? null : pkg.id)}
                  className="rounded border border-black/10 px-3 py-1 text-sm dark:border-white/15"
                >
                  Comprar
                </button>
              </div>
            </div>
            {openPackageId === pkg.id && (
              <div className="flex flex-col gap-1 border-t border-black/10 pt-3 dark:border-white/15">
                <p className="text-xs opacity-70">Subí el comprobante de la transferencia (imagen o PDF).</p>
                <ProofForm busy={busy} onSubmit={(file) => handleBuy(pkg.id, file)} />
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Mis compras</h2>
        {!purchases && <p className="opacity-70">Cargando…</p>}
        {purchases?.length === 0 && <p className="opacity-70">Todavía no compraste ningún paquete.</p>}
        {purchases?.map((purchase) => (
          <div key={purchase.id} className="flex flex-col gap-2 rounded border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{purchase.package.name}</p>
                <p className="text-xs opacity-70">
                  {formatDate(purchase.createdAt)} · {purchase.propertiesUsed}/{purchase.propertiesQuota} propiedades usadas
                </p>
              </div>
              <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLES[purchase.status]}`}>
                {PURCHASE_STATUS_LABELS[purchase.status]}
              </span>
            </div>
            {purchase.status === 'REJECTED' && (
              <div className="flex flex-col gap-1 border-t border-black/10 pt-2 dark:border-white/15">
                {resendingId === purchase.id ? (
                  <ProofForm busy={busy} onSubmit={(file) => handleResend(purchase.id, file)} />
                ) : (
                  <button onClick={() => setResendingId(purchase.id)} className="w-fit text-sm text-brand-navy underline">
                    Reenviar comprobante
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
