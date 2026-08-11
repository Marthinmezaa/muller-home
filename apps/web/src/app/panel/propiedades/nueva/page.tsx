'use client';

import { useRouter } from 'next/navigation';
import { PropertyForm } from '@/components/PropertyForm';
import { createProperty } from '@/lib/api';
import type { PropertyInput } from '@/lib/types';

export default function NuevaPropiedadPage() {
  const router = useRouter();

  async function handleSubmit(input: PropertyInput) {
    const property = await createProperty(input);
    router.push(`/panel/propiedades/${property.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Nueva propiedad</h1>
      <PropertyForm onSubmit={handleSubmit} submitLabel="Crear" />
    </div>
  );
}
