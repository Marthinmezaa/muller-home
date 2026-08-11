// Espejo de los enums de apps/api/prisma/schema.prisma. Sin paquete
// compartido todavia (no existe packages/shared) — duplicar 4 enums
// chicos es mas simple que armar esa infra para esto.

export type OperationType = 'SALE' | 'RENT';

export type PropertyType = 'HOUSE' | 'APARTMENT' | 'LAND' | 'COMMERCIAL_LOCAL' | 'OFFICE';

export type PropertyStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'SOLD' | 'RENTED';

export type MediaType = 'PHOTO' | 'VIDEO';

export type Role = 'ADVISOR' | 'FRANCHISE_ADMIN' | 'SUPER_ADMIN';

export type BillingType = 'ONE_TIME' | 'MONTHLY';

export type PurchaseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  ONE_TIME: 'Pago único',
  MONTHLY: 'Mensual',
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

/** Combinar con `badge` de lib/ui.ts. Oro con dark:text-brand-gold en PENDING: ver PR #37 (contraste en dark mode). */
export const PURCHASE_STATUS_STYLES: Record<PurchaseStatus, string> = {
  PENDING: 'bg-brand-gold/20 text-[#8a6b0a] dark:text-brand-gold',
  APPROVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

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

/** Fila de GET /auth/franchise/members — solo para el panel de franquicia. */
export interface FranchiseMember {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  _count: { properties: number };
}

/** Fila de GET /properties/deletion-requests — solo para el panel de franquicia. */
export interface DeletionRequest {
  id: string;
  createdAt: string;
  property: { id: string; title: string };
  requestedBy: { fullName: string };
}

export interface Package {
  id: string;
  name: string;
  billingType: BillingType;
  price: string;
  propertiesQuota: number;
  productionsQuota: number;
  maxAdvisors: number;
  active: boolean;
}

/** Fila de GET /packages/purchases — solo para el panel de super admin. */
export interface PackagePurchase {
  id: string;
  status: PurchaseStatus;
  propertiesQuota: number;
  propertiesUsed: number;
  createdAt: string;
  package: Pick<Package, 'id' | 'name' | 'billingType' | 'price'>;
  buyer: { fullName: string; email: string };
}

/** Fila de GET /packages/purchases/mine — sin `buyer` (sos vos), para el panel de asesor/franquicia. */
export type MyPurchase = Omit<PackagePurchase, 'buyer'>;

/** Campos del formulario de alta de paquete — mismos que CreatePackageDto de la API. */
export interface PackageInput {
  name: string;
  billingType: BillingType;
  price: number;
  propertiesQuota: number;
  productionsQuota: number;
  maxAdvisors?: number;
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
