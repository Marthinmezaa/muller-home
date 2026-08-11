import { OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS, type SearchFilters as Filters } from '@/lib/types';

// Form GET nativo: sin JS, sin useState/useRouter. Al enviar, el navegador
// navega a "/?city=...&operationType=..." y la page server-side vuelve a
// buscar con esos searchParams.
export function SearchFilters({ filters }: { filters: Filters }) {
  return (
    <form className="grid grid-cols-2 gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-3 md:grid-cols-6 dark:border-white/15">
      <input
        type="text"
        name="city"
        placeholder="Ciudad"
        defaultValue={filters.city}
        className="col-span-2 rounded border border-black/10 bg-transparent px-3 py-2 sm:col-span-1 dark:border-white/15"
      />
      <select
        name="operationType"
        defaultValue={filters.operationType ?? ''}
        className="rounded border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
      >
        <option value="">Comprar o alquilar</option>
        {Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        name="propertyType"
        defaultValue={filters.propertyType ?? ''}
        className="rounded border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
      >
        <option value="">Tipo de propiedad</option>
        {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        type="number"
        name="minPrice"
        placeholder="Precio min."
        defaultValue={filters.minPrice}
        min={0}
        className="rounded border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
      />
      <input
        type="number"
        name="maxPrice"
        placeholder="Precio max."
        defaultValue={filters.maxPrice}
        min={0}
        className="rounded border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
      />
      <input
        type="number"
        name="minRooms"
        placeholder="Ambientes min."
        defaultValue={filters.minRooms}
        min={0}
        className="rounded border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
      />
      <button
        type="submit"
        className="col-span-2 rounded bg-brand-navy px-4 py-2 text-white sm:col-span-1 md:col-span-6"
      >
        Buscar
      </button>
    </form>
  );
}
