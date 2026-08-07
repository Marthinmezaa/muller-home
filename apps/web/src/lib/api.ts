import type { Lead, Property, SafeUser, SearchFilters } from './types';

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

export interface LeadInput {
  name: string;
  phone: string;
  message: string;
}

export async function createLead(propertyId: string, lead: LeadInput): Promise<void> {
  const res = await fetch(`${API_URL}/properties/${propertyId}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  if (!res.ok) {
    throw new Error('No se pudo enviar el mensaje');
  }
}

// --- Panel de asesor: la API pone la cookie de sesión en su propio origen
// (distinto puerto en dev), así que estas llamadas van siempre desde el
// browser con credentials:'include' — no hay forma de leer esa cookie desde
// el servidor de Next.js. Por eso el panel entero es client-side. ---

export async function login(email: string, password: string): Promise<SafeUser> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error('Email o contraseña incorrectos');
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function getMe(): Promise<SafeUser | null> {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  return res.ok ? res.json() : null;
}

export async function getMyProperties(): Promise<Property[]> {
  const res = await fetch(`${API_URL}/properties/mine`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudieron cargar tus propiedades');
  }
  return res.json();
}

export async function getMyLeads(): Promise<Lead[]> {
  const res = await fetch(`${API_URL}/leads`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudieron cargar tus leads');
  }
  return res.json();
}
