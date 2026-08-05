'use client';

import dynamic from 'next/dynamic';
import type { Property } from '@/lib/types';

// Leaflet toca `window` al importarse, asi que no puede rendear en el
// servidor. `ssr: false` solo esta permitido dentro de un Client Component
// (por eso este archivo separado en vez de llamarlo directo desde page.tsx,
// que es un Server Component).
const PropertyMap = dynamic(() => import('./PropertyMap').then((m) => m.PropertyMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm opacity-50">Cargando mapa…</div>,
});

export function PropertyMapLoader({ properties }: { properties: Property[] }) {
  return <PropertyMap properties={properties} />;
}
