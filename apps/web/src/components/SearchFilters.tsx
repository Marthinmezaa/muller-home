import { OPERATION_TYPE_LABELS, PROPERTY_TYPE_LABELS, type SearchFilters as Filters } from '@/lib/types';
import { buttonPrimary, card, input } from '@/lib/ui';

// Form GET nativo: sin JS, sin useState/useRouter. Al enviar, el navegador
// navega a "/?city=...&operationType=..." y la page server-side vuelve a
// buscar con esos searchParams.
export function SearchFilters({ filters }: { filters: Filters }) {
  return (
    <form className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 ${card}`}>
      <label className="sr-only" htmlFor="city">
        Ciudad
      </label>
      <input id="city" type="text" name="city" placeholder="Ciudad" defaultValue={filters.city} className={`col-span-2 sm:col-span-1 ${input}`} />

      <label className="sr-only" htmlFor="operationType">
        Comprar o alquilar
      </label>
      <select id="operationType" name="operationType" defaultValue={filters.operationType ?? ''} className={input}>
        <option value="">Comprar o alquilar</option>
        {Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="propertyType">
        Tipo de propiedad
      </label>
      <select id="propertyType" name="propertyType" defaultValue={filters.propertyType ?? ''} className={input}>
        <option value="">Tipo de propiedad</option>
        {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="minPrice">
        Precio mínimo
      </label>
      <input id="minPrice" type="number" name="minPrice" placeholder="Precio min." defaultValue={filters.minPrice} min={0} className={input} />

      <label className="sr-only" htmlFor="maxPrice">
        Precio máximo
      </label>
      <input id="maxPrice" type="number" name="maxPrice" placeholder="Precio max." defaultValue={filters.maxPrice} min={0} className={input} />

      <label className="sr-only" htmlFor="minRooms">
        Ambientes mínimos
      </label>
      <input id="minRooms" type="number" name="minRooms" placeholder="Ambientes min." defaultValue={filters.minRooms} min={0} className={input} />

      <button type="submit" className={`col-span-2 sm:col-span-1 md:col-span-6 ${buttonPrimary}`}>
        Buscar
      </button>
    </form>
  );
}
