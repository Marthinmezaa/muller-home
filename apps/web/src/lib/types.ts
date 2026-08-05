// Espejo de los enums de apps/api/prisma/schema.prisma. Sin paquete
// compartido todavia (no existe packages/shared) — duplicar 4 enums
// chicos es mas simple que armar esa infra para esto.

export type OperationType = 'SALE' | 'RENT';

export type PropertyType = 'HOUSE' | 'APARTMENT' | 'LAND' | 'COMMERCIAL_LOCAL' | 'OFFICE';

export type PropertyStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'SOLD' | 'RENTED';

export type MediaType = 'PHOTO' | 'VIDEO';

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
  media: PropertyMedia[];
  owner?: PropertyOwner;
}

export interface SearchFilters {
  city?: string;
  operationType?: OperationType;
  propertyType?: PropertyType;
  minPrice?: string;
  maxPrice?: string;
  minRooms?: string;
}
