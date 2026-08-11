'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMe, getMyProperties, getQuota } from '@/lib/api';
import { PROPERTY_STATUS_LABELS, type Property } from '@/lib/types';

export default function PanelPage() {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState(false);
  const [quota, setQuota] = useState<number | null>(null);

  useEffect(() => {
    getMyProperties()
      .then(setProperties)
      .catch(() => setError(true));
    // Cupo disponible solo tiene sentido para quien publica propiedades — un
    // super_admin no compra paquetes, así que getQuota() le daría siempre 0.
    getMe().then((me) => {
      if (me?.role === 'ADVISOR' || me?.role === 'FRANCHISE_ADMIN') {
        getQuota().then(setQuota).catch(() => {});
      }
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/panel/propiedades/nueva" className="w-fit rounded bg-brand-navy px-4 py-2 text-sm text-white">
          Cargar propiedad
        </Link>
        {quota !== null && (
          <p className="text-sm opacity-70">
            Cupo disponible: <span className="font-medium opacity-100">{quota}</span>{' '}
            {quota === 1 ? 'propiedad' : 'propiedades'}
            {quota === 0 && (
              <>
                {' — '}
                <Link href="/panel/comprar" className="text-brand-navy underline dark:text-brand-gold">
                  comprar más
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">No se pudieron cargar tus propiedades.</p>}
      {!error && !properties && <p className="opacity-70">Cargando…</p>}
      {!error && properties?.length === 0 && <p className="opacity-70">Todavía no cargaste ninguna propiedad.</p>}

      {properties && properties.length > 0 && (
        <div className="flex flex-col gap-2">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/panel/propiedades/${property.id}`}
              className="flex items-center justify-between rounded border border-black/10 p-4 transition hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
            >
              <div>
                <p className="font-medium">{property.title}</p>
                <p className="text-xs opacity-70">{property.city}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="opacity-70">{property.viewsCount} vistas</span>
                <span className="opacity-70">{property._count?.leads ?? 0} leads</span>
                <span className="rounded bg-black/5 px-2 py-1 text-xs font-medium dark:bg-white/10">
                  {PROPERTY_STATUS_LABELS[property.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
