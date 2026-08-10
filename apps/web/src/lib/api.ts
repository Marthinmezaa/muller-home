import type {
  DeletionRequest,
  FranchiseMember,
  Lead,
  Package,
  PackageInput,
  PackagePurchase,
  Property,
  PropertyInput,
  PropertyMedia,
  SafeUser,
  SearchFilters,
} from './types';

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

// --- Alta y edición de propiedad (panel de asesor) ---

async function apiError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => null);
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
  return new Error(message ?? fallback);
}

export async function createProperty(input: PropertyInput): Promise<Property> {
  const res = await fetch(`${API_URL}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo crear la propiedad');
  }
  return res.json();
}

export async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<Property> {
  const res = await fetch(`${API_URL}/properties/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await apiError(res, 'No se pudieron guardar los cambios');
  }
  return res.json();
}

/** A diferencia de getProperty, trae la propiedad sin importar su estado (draft/paused incluidos) — para el panel, no el portal público. */
export async function getManagedProperty(id: string): Promise<Property> {
  const res = await fetch(`${API_URL}/properties/${id}/manage`, { credentials: 'include' });
  if (res.status === 404) {
    return null as never;
  }
  if (!res.ok) {
    throw await apiError(res, 'No se pudo cargar la propiedad');
  }
  return res.json();
}

export async function uploadPropertyMedia(propertyId: string, file: File): Promise<PropertyMedia> {
  const formData = new FormData();
  formData.append('media', file);
  const res = await fetch(`${API_URL}/properties/${propertyId}/media`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    throw await apiError(res, `No se pudo subir ${file.name}`);
  }
  return res.json();
}

export async function deletePropertyMedia(propertyId: string, mediaId: string): Promise<void> {
  const res = await fetch(`${API_URL}/properties/${propertyId}/media/${mediaId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo borrar la foto');
  }
}

export async function reorderPropertyMedia(propertyId: string, mediaIds: string[]): Promise<PropertyMedia[]> {
  const res = await fetch(`${API_URL}/properties/${propertyId}/media/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ mediaIds }),
  });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo reordenar');
  }
  return res.json();
}

async function changePropertyStatus(id: string, action: 'publish' | 'pause' | 'reactivate' | 'close'): Promise<Property> {
  const res = await fetch(`${API_URL}/properties/${id}/${action}`, { method: 'PATCH', credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo actualizar el estado');
  }
  return res.json();
}

export const publishProperty = (id: string) => changePropertyStatus(id, 'publish');
export const pauseProperty = (id: string) => changePropertyStatus(id, 'pause');
export const reactivateProperty = (id: string) => changePropertyStatus(id, 'reactivate');
export const closeProperty = (id: string) => changePropertyStatus(id, 'close');

export async function requestPropertyDeletion(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/properties/${id}/deletion-requests`, { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo pedir la baja');
  }
}

// --- Panel de franquicia: equipo, invitaciones y solicitudes de baja ---

export async function getFranchiseMembers(): Promise<FranchiseMember[]> {
  const res = await fetch(`${API_URL}/auth/franchise/members`, { credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo cargar el equipo');
  }
  return res.json();
}

export async function createFranchiseInvite(): Promise<{ token: string; expiresAt: string }> {
  const res = await fetch(`${API_URL}/auth/franchise/invite`, { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo generar la invitación');
  }
  return res.json();
}

export interface AcceptInviteInput {
  token: string;
  email: string;
  password: string;
  fullName: string;
}

export async function acceptInvite(input: AcceptInviteInput): Promise<SafeUser> {
  const res = await fetch(`${API_URL}/auth/accept-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo completar el registro');
  }
  return res.json();
}

export async function getPendingDeletionRequests(): Promise<DeletionRequest[]> {
  const res = await fetch(`${API_URL}/properties/deletion-requests`, { credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudieron cargar las solicitudes de baja');
  }
  return res.json();
}

async function reviewDeletionRequest(id: string, action: 'approve' | 'reject'): Promise<void> {
  const res = await fetch(`${API_URL}/properties/deletion-requests/${id}/${action}`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo actualizar la solicitud');
  }
}

export const approveDeletionRequest = (id: string) => reviewDeletionRequest(id, 'approve');
export const rejectDeletionRequest = (id: string) => reviewDeletionRequest(id, 'reject');

// --- Panel de super admin: pagos de paquetes y catálogo ---

export async function getPackages(): Promise<Package[]> {
  const res = await fetch(`${API_URL}/packages`, { credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo cargar el catálogo');
  }
  return res.json();
}

export async function createPackage(input: PackageInput): Promise<Package> {
  const res = await fetch(`${API_URL}/packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo crear el paquete');
  }
  return res.json();
}

export async function getAllPurchases(): Promise<PackagePurchase[]> {
  const res = await fetch(`${API_URL}/packages/purchases`, { credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudieron cargar las compras');
  }
  return res.json();
}

export async function getPurchaseProofUrl(id: string): Promise<string> {
  const res = await fetch(`${API_URL}/packages/purchases/${id}/proof-url`, { credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo cargar el comprobante');
  }
  const { url } = await res.json();
  return url;
}

async function reviewPurchase(id: string, action: 'approve' | 'reject'): Promise<void> {
  const res = await fetch(`${API_URL}/packages/purchases/${id}/${action}`, { method: 'PATCH', credentials: 'include' });
  if (!res.ok) {
    throw await apiError(res, 'No se pudo actualizar la compra');
  }
}

export const approvePurchase = (id: string) => reviewPurchase(id, 'approve');
export const rejectPurchase = (id: string) => reviewPurchase(id, 'reject');
