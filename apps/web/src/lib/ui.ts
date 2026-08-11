// Clases de UI compartidas — botones, cards, inputs y badges reutilizados en
// toda la app. Son strings, no componentes: se aplican igual a <button>,
// <Link> o <div> sin necesitar una prop `as` ni una nueva capa de abstracción.

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50';

const buttonPrimaryColors =
  'bg-brand-navy text-white shadow-sm hover:bg-brand-navy/90 hover:shadow active:scale-[0.98] dark:bg-brand-gold dark:text-brand-ink dark:hover:bg-brand-gold/90';

const buttonSecondaryColors =
  'border border-black/10 hover:bg-black/5 active:scale-[0.98] dark:border-white/15 dark:hover:bg-white/5';

export const buttonPrimary = `${buttonBase} px-4 py-2 ${buttonPrimaryColors}`;
export const buttonPrimarySm = `${buttonBase} px-3 py-1.5 ${buttonPrimaryColors}`;
export const buttonSecondary = `${buttonBase} px-4 py-2 ${buttonSecondaryColors}`;
export const buttonSecondarySm = `${buttonBase} px-3 py-1.5 ${buttonSecondaryColors}`;
export const buttonDanger = `${buttonBase} px-3 py-1.5 border border-red-600/30 text-red-600 hover:bg-red-600/5 active:scale-[0.98] dark:hover:bg-red-500/10`;

/** Texto/link con el color de acento de marca — navy en claro, oro en oscuro (contraste ~12:1 sobre fondo casi negro, ver PR #37). */
export const accentText = 'text-brand-navy dark:text-brand-gold';
export const linkAccent = `${accentText} underline-offset-2 hover:underline`;

export const card =
  'rounded-xl border border-black/10 bg-white/40 p-4 shadow-sm transition-shadow dark:border-white/15 dark:bg-white/[0.03]';
export const cardInteractive = `${card} hover:shadow-md hover:border-black/20 dark:hover:border-white/25`;

export const input =
  'w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none transition-shadow focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20 dark:border-white/15 dark:focus:border-brand-gold dark:focus:ring-brand-gold/20';

export const badge = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';
export const badgeNeutral = `${badge} bg-black/5 dark:bg-white/10`;
