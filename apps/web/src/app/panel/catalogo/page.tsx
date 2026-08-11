'use client';

import { useEffect, useState } from 'react';
import { createPackage, getPackages } from '@/lib/api';
import { BILLING_TYPE_LABELS, type BillingType, type Package, type PackageInput } from '@/lib/types';

const inputClass = 'rounded border border-black/10 px-3 py-2 dark:border-white/15';

const emptyForm: PackageInput = {
  name: '',
  billingType: 'ONE_TIME',
  price: 0,
  propertiesQuota: 1,
  productionsQuota: 0,
  maxAdvisors: 1,
};

export default function PanelCatalogoPage() {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PackageInput>(emptyForm);
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');

  useEffect(() => {
    getPackages()
      .then(setPackages)
      .catch((err: Error) => setError(err.message));
  }, []);

  function set<K extends keyof PackageInput>(key: K, value: PackageInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    try {
      const created = await createPackage(form);
      setPackages((current) => [...(current ?? []), created]);
      setForm(emptyForm);
      setStatus('idle');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/15">
        <p className="text-sm font-medium">Crear paquete</p>
        <input required placeholder="Nombre" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
        <select
          value={form.billingType}
          onChange={(e) => set('billingType', e.target.value as BillingType)}
          className={inputClass}
        >
          {Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          required
          type="number"
          min="0"
          placeholder="Precio"
          value={form.price}
          onChange={(e) => set('price', Number(e.target.value))}
          className={inputClass}
        />
        <input
          required
          type="number"
          min="1"
          placeholder="Cupo de propiedades"
          value={form.propertiesQuota}
          onChange={(e) => set('propertiesQuota', Number(e.target.value))}
          className={inputClass}
        />
        <input
          required
          type="number"
          min="0"
          placeholder="Cupo de producciones"
          value={form.productionsQuota}
          onChange={(e) => set('productionsQuota', Number(e.target.value))}
          className={inputClass}
        />
        <input
          type="number"
          min="1"
          placeholder="Máximo de asesores (franquicia)"
          value={form.maxAdvisors}
          onChange={(e) => set('maxAdvisors', Number(e.target.value))}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-fit rounded bg-brand-navy px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {status === 'sending' ? 'Creando…' : 'Crear paquete'}
        </button>
        {status === 'error' && error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {error && status !== 'error' && <p className="text-sm text-red-600">{error}</p>}
      {!packages && !error && <p className="opacity-70">Cargando…</p>}

      {packages && packages.length > 0 && (
        <div className="flex flex-col gap-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="flex items-center justify-between rounded border border-black/10 p-4 dark:border-white/15">
              <div>
                <p className="font-medium">{pkg.name}</p>
                <p className="text-xs opacity-70">
                  {BILLING_TYPE_LABELS[pkg.billingType]} · {pkg.propertiesQuota} propiedades · {pkg.productionsQuota} producciones
                  {pkg.maxAdvisors > 1 ? ` · hasta ${pkg.maxAdvisors} asesores` : ''}
                </p>
              </div>
              <p className="text-sm font-medium">Gs. {Number(pkg.price).toLocaleString('es-PY')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
