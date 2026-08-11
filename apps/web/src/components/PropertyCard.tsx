import Image from 'next/image';
import Link from 'next/link';
import { CLOSED_STATUS_LABELS, OPERATION_TYPE_LABELS, type Property } from '@/lib/types';

function formatPrice(price: string): string {
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Number(price));
}

export function PropertyCard({ property }: { property: Property }) {
  const cover = property.media.find((m) => m.isCover) ?? property.media[0];
  const closedLabel = CLOSED_STATUS_LABELS[property.status];

  return (
    <Link
      href={`/propiedades/${property.id}`}
      className="group block overflow-hidden rounded-xl border border-black/10 bg-white/40 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-white/25"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/5 dark:bg-white/5">
        {cover ? (
          <Image
            src={cover.url}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm opacity-50">Sin fotos</div>
        )}
        {closedLabel && (
          <span className="absolute top-2 left-2 rounded-full bg-black/80 px-2.5 py-1 text-xs font-medium text-white">
            {closedLabel}
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs opacity-70">
          {OPERATION_TYPE_LABELS[property.operationType]} · {property.city}
        </p>
        <h3 className="font-medium">{property.title}</h3>
        <p className="text-lg font-bold text-brand-navy dark:text-brand-gold">Gs. {formatPrice(property.price)}</p>
        <p className="text-xs opacity-70">
          {property.rooms} amb. · {property.bathrooms} baños · {property.areaM2} m²
        </p>
      </div>
    </Link>
  );
}
