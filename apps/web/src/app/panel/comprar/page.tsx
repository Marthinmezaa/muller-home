'use client';

import { useEffect, useState } from 'react';
import { getMyPurchases, getPackages, purchasePackage, resendPurchaseProof } from '@/lib/api';
import { BILLING_TYPE_LABELS, PURCHASE_STATUS_LABELS, PURCHASE_STATUS_STYLES, type MyPurchase, type Package } from '@/lib/types';
import { badge, buttonPrimarySm, buttonSecondarySm, card, linkAccent } from '@/lib/ui';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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
      <button disabled={!file || busy} onClick={() => file && onSubmit(file)} className={buttonPrimarySm}>
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
        <h2 className="text-lg font-semibold tracking-tight">Catálogo</h2>
        {!packages && <p className="opacity-70">Cargando…</p>}
        {packages?.length === 0 && <p className="opacity-70">No hay paquetes disponibles.</p>}
        {packages?.map((pkg) => (
          <div key={pkg.id} className={`flex flex-col gap-3 ${card}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{pkg.name}</p>
                <p className="text-xs opacity-70">
                  {BILLING_TYPE_LABELS[pkg.billingType]} · {pkg.propertiesQuota} propiedades · {pkg.productionsQuota} producciones
                  {pkg.maxAdvisors > 1 ? ` · hasta ${pkg.maxAdvisors} asesores` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-brand-navy dark:text-brand-gold">Gs. {Number(pkg.price).toLocaleString('es-PY')}</p>
                <button onClick={() => setOpenPackageId(openPackageId === pkg.id ? null : pkg.id)} className={buttonSecondarySm}>
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
        <h2 className="text-lg font-semibold tracking-tight">Mis compras</h2>
        {!purchases && <p className="opacity-70">Cargando…</p>}
        {purchases?.length === 0 && <p className="opacity-70">Todavía no compraste ningún paquete.</p>}
        {purchases?.map((purchase) => (
          <div key={purchase.id} className={`flex flex-col gap-2 ${card}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{purchase.package.name}</p>
                <p className="text-xs opacity-70">
                  {formatDate(purchase.createdAt)} · {purchase.propertiesUsed}/{purchase.propertiesQuota} propiedades usadas
                </p>
              </div>
              <span className={`${badge} ${PURCHASE_STATUS_STYLES[purchase.status]}`}>{PURCHASE_STATUS_LABELS[purchase.status]}</span>
            </div>
            {purchase.status === 'REJECTED' && (
              <div className="flex flex-col gap-1 border-t border-black/10 pt-2 dark:border-white/15">
                {resendingId === purchase.id ? (
                  <ProofForm busy={busy} onSubmit={(file) => handleResend(purchase.id, file)} />
                ) : (
                  <button onClick={() => setResendingId(purchase.id)} className={`w-fit text-sm ${linkAccent}`}>
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
