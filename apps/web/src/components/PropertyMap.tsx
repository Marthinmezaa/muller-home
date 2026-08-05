'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import Link from 'next/link';
import type { Property } from '@/lib/types';

// ponytail: iconos servidos desde el CDN de unpkg (pineado a la version
// instalada) en vez de resolver el import de las imagenes de Leaflet via
// el bundler, que rompe distinto segun Turbopack/webpack. Si el portal
// necesita funcionar offline, cambiar por assets propios en /public.
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Centro de Asuncion: fallback cuando la busqueda no tiene resultados con
// coordenadas para centrar el mapa.
const DEFAULT_CENTER: [number, number] = [-25.2637, -57.5759];

function formatPrice(price: string): string {
  return new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Number(price));
}

export function PropertyMap({ properties }: { properties: Property[] }) {
  const points = properties
    .map((property) => ({ property, lat: Number(property.lat), lng: Number(property.lng) }))
    .filter(({ lat, lng }) => Number.isFinite(lat) && Number.isFinite(lng));

  const center: [number, number] = points.length > 0 ? [points[0].lat, points[0].lng] : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={points.length > 0 ? 12 : 7} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map(({ property, lat, lng }) => (
        <Marker key={property.id} position={[lat, lng]} icon={markerIcon}>
          <Popup>
            <Link href={`/propiedades/${property.id}`} className="font-medium underline">
              {property.title}
            </Link>
            <br />
            Gs. {formatPrice(property.price)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
