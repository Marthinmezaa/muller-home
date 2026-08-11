import { searchProperties } from '@/lib/api';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyMapLoader } from '@/components/PropertyMapLoader';
import { SearchFilters } from '@/components/SearchFilters';
import type { SearchFilters as Filters } from '@/lib/types';

// searchParams via query string (?city=...) para que el form GET nativo de
// SearchFilters funcione sin JS: recarga esta misma page con los filtros.
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filters: Filters = {
    city: params.city,
    operationType: params.operationType as Filters['operationType'],
    propertyType: params.propertyType as Filters['propertyType'],
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    minRooms: params.minRooms,
  };

  const properties = await searchProperties(filters);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Buscá tu próxima propiedad</h1>
      <SearchFilters filters={filters} />

      <div className="h-96 overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
        <PropertyMapLoader properties={properties} />
      </div>

      {properties.length === 0 ? (
        <p className="opacity-70">No hay propiedades que coincidan con esa búsqueda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </main>
  );
}
