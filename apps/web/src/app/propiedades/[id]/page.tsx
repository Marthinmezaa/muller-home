import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProperty } from '@/lib/api';
import { CLOSED_STATUS_LABELS, OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/types';

function formatPrice(price: string): string {
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Number(price));
}

function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

  const closedLabel = CLOSED_STATUS_LABELS[property.status];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <Link href="/" className="text-sm opacity-70 hover:underline">
        ← Volver al buscador
      </Link>

      {closedLabel && (
        <p className="rounded bg-black/80 px-3 py-2 text-sm font-medium text-white">
          Esta propiedad ya fue {closedLabel.toLowerCase()}, pero la dejamos visible para que conozcas el trabajo de
          nuestros asesores.
        </p>
      )}

      {property.media.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {property.media.map((item) =>
            item.type === 'VIDEO' ? (
              <video
                key={item.id}
                src={item.url}
                controls
                className="col-span-2 aspect-video w-full rounded sm:col-span-3"
              />
            ) : (
              <div key={item.id} className="relative aspect-[4/3] overflow-hidden rounded">
                <Image src={item.url} alt={property.title} fill className="object-cover" unoptimized />
              </div>
            ),
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm opacity-70">
          {OPERATION_TYPE_LABELS[property.operationType]} · {PROPERTY_TYPE_LABELS[property.propertyType]} ·{' '}
          {property.city}
        </p>
        <h1 className="text-2xl font-semibold">{property.title}</h1>
        <p className="text-xl font-semibold">Gs. {formatPrice(property.price)}</p>
        <p className="text-sm opacity-70">
          {property.rooms} ambientes · {property.bathrooms} baños · {property.areaM2} m² · {property.address}
        </p>
        <p className="whitespace-pre-wrap pt-2">{property.description}</p>
      </div>

      {property.owner?.phone && (
        <a
          href={whatsappLink(property.owner.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit rounded bg-[#3B3A72] px-4 py-2 text-white"
        >
          Contactar a {property.owner.fullName} por WhatsApp
        </a>
      )}
    </main>
  );
}
