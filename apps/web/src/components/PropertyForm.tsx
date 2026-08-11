'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS, type PropertyInput } from '@/lib/types';

// Leaflet toca `window` al importarse — mismo motivo que PropertyMapLoader.tsx,
// pero acá no hace falta un archivo aparte porque PropertyForm ya es Client Component.
const PropertyLocationPicker = dynamic(
  () => import('./PropertyLocationPicker').then((m) => m.PropertyLocationPicker),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm opacity-50">Cargando mapa…</div> },
);

const inputClass = 'rounded border border-black/10 px-3 py-2 dark:border-white/15';

export function PropertyForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<PropertyInput>;
  onSubmit: (input: PropertyInput) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<PropertyInput>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    operationType: initial?.operationType ?? 'SALE',
    propertyType: initial?.propertyType ?? 'HOUSE',
    price: initial?.price ?? 0,
    areaM2: initial?.areaM2 ?? 0,
    rooms: initial?.rooms ?? 0,
    bathrooms: initial?.bathrooms ?? 0,
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    lat: initial?.lat ?? 0,
    lng: initial?.lng ?? 0,
  });
  const [hasPoint, setHasPoint] = useState(Boolean(initial?.lat && initial?.lng));
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');

  function set<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!hasPoint) {
      setError('Marcá la ubicación en el mapa.');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      await onSubmit(values);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        required
        placeholder="Título"
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        className={inputClass}
      />
      <textarea
        required
        placeholder="Descripción"
        rows={4}
        value={values.description}
        onChange={(e) => set('description', e.target.value)}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <select value={values.operationType} onChange={(e) => set('operationType', e.target.value as PropertyInput['operationType'])} className={inputClass}>
          {Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={values.propertyType} onChange={(e) => set('propertyType', e.target.value as PropertyInput['propertyType'])} className={inputClass}>
          {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input required type="number" min={0} placeholder="Precio" value={values.price} onChange={(e) => set('price', Number(e.target.value))} className={inputClass} />
        <input required type="number" min={0} placeholder="Superficie m²" value={values.areaM2} onChange={(e) => set('areaM2', Number(e.target.value))} className={inputClass} />
        <input required type="number" min={0} placeholder="Ambientes" value={values.rooms} onChange={(e) => set('rooms', Number(e.target.value))} className={inputClass} />
        <input required type="number" min={0} placeholder="Baños" value={values.bathrooms} onChange={(e) => set('bathrooms', Number(e.target.value))} className={inputClass} />
      </div>
      <input required placeholder="Dirección" value={values.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
      <input required placeholder="Ciudad" value={values.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />

      <div>
        <p className="mb-1 text-sm opacity-70">Ubicación (clickeá el mapa para marcarla)</p>
        <div className="h-72 overflow-hidden rounded border border-black/10 dark:border-white/15">
          <PropertyLocationPicker
            lat={hasPoint ? values.lat : null}
            lng={hasPoint ? values.lng : null}
            onChange={(lat, lng) => {
              set('lat', lat);
              set('lng', lng);
              setHasPoint(true);
            }}
          />
        </div>
      </div>

      <button type="submit" disabled={status === 'sending'} className="w-fit rounded bg-brand-navy px-4 py-2 text-white disabled:opacity-50">
        {status === 'sending' ? 'Guardando…' : submitLabel}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
