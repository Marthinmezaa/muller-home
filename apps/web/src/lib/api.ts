import type { Property, SearchFilters } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function buildQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function searchProperties(filters: SearchFilters): Promise<Property[]> {
  const res = await fetch(`${API_URL}/properties${buildQuery(filters)}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('No se pudieron cargar las propiedades');
  }
  return res.json();
}

export async function getProperty(id: string): Promise<Property | null> {
  const res = await fetch(`${API_URL}/properties/${id}`, { cache: 'no-store' });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error('No se pudo cargar la propiedad');
  }
  return res.json();
}
