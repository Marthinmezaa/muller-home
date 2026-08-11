/**
 * Label accesible (sr-only) + su input, sin envolver en un <div> — un
 * Fragment no agrega nodo al DOM, así que no rompe layouts de grid/flex
 * donde las clases de columna/tamaño están puestas en el propio input
 * (ver SearchFilters). `htmlFor`/`id` asocian el label igual, sin
 * necesitar que sean hermanos directos.
 */
export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <>
      <label className="sr-only" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </>
  );
}
