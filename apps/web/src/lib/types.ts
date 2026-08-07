// Espejo de los enums de apps/api/prisma/schema.prisma. Sin paquete
// compartido todavia (no existe packages/shared) — duplicar 4 enums
// chicos es mas simple que armar esa infra para esto.

export type OperationType = 'SALE' | 'RENT';

export type PropertyType = 'HOUSE' | 'APARTMENT' | 'LAND' | 'COMMERCIAL_LOCAL' | 'OFFICE';

export type PropertyStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'SOLD' | 'RENTED';

export type MediaType = 'PHOTO' | 'VIDEO';

export type Role = 'ADVISOR' | 'FRANCHISE_ADMIN' | 'SUPER_ADMIN';

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  PAUSED: 'Pausada',
  SOLD: 'Vendida',
  RENTED: 'Alquilada',
};

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  SALE: 'Venta',
  RENT: 'Alquiler',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  HOUSE: 'Casa',
  APARTMENT: 'Departamento',
  LAND: 'Terreno',
  COMMERCIAL_LOCAL: 'Local comercial',
  OFFICE: 'Oficina',
};

export const CLOSED_STATUS_LABELS: Partial<Record<PropertyStatus, string>> = {
  SOLD: 'Vendido',
  RENTED: 'Alquilado',
};

export interface PropertyMedia {
  id: string;
  type: MediaType;
  order: number;
  isCover: boolean;
  /** URL prefirmada de R2, ya resuelta por la API (properties.service.attachMediaUrls). */
  url: string;
}

export interface PropertyOwner {
  fullName: string;
  phone: string | null;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  operationType: OperationType;
  propertyType: PropertyType;
  price: string;
  areaM2: string;
  rooms: number;
  bathrooms: number;
  address: string;
  city: string;
  lat: string;
  lng: string;
  status: PropertyStatus;
  closedAt: string | null;
  viewsCount: number;
  media: PropertyMedia[];
  owner?: PropertyOwner;
  /** Solo presente en GET /properties/mine (panel de asesor). */
  _count?: { leads: number };
}

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  franchiseId: string | null;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  createdAt: string;
  property: { id: string; title: string };
}

/** Campos editables de una propiedad — mismos que CreatePropertyDto/UpdatePropertyDto de la API. */
export interface PropertyInput {
  title: string;
  description: string;
  operationType: OperationType;
  propertyType: PropertyType;
  price: number;
  areaM2: number;
  rooms: number;
  bathrooms: number;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

export interface SearchFilters {
  city?: string;
  operationType?: OperationType;
  propertyType?: PropertyType;
  minPrice?: string;
  maxPrice?: string;
  minRooms?: string;
}
