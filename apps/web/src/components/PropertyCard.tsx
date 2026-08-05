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
      className="block overflow-hidden rounded-lg border border-black/10 transition hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
    >
      <div className="relative aspect-[4/3] bg-black/5 dark:bg-white/5">
        {cover ? (
          <Image src={cover.url} alt={property.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-sm opacity-50">Sin fotos</div>
        )}
        {closedLabel && (
          <span className="absolute top-2 left-2 rounded bg-black/80 px-2 py-1 text-xs font-medium text-white">
            {closedLabel}
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="text-xs opacity-70">
          {OPERATION_TYPE_LABELS[property.operationType]} · {property.city}
        </p>
        <h3 className="font-medium">{property.title}</h3>
        <p className="font-semibold">Gs. {formatPrice(property.price)}</p>
        <p className="text-xs opacity-70">
          {property.rooms} amb. · {property.bathrooms} baños · {property.areaM2} m²
        </p>
      </div>
    </Link>
  );
}
