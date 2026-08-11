'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getMe, logout } from '@/lib/api';
import type { SafeUser } from '@/lib/types';
import { accentText, buttonSecondarySm } from '@/lib/ui';

const navLink = (active: boolean) =>
  active ? `font-medium ${accentText}` : 'opacity-60 transition-opacity hover:opacity-100';

// Gate client-side: la sesión vive en una cookie del origen de la API, que el
// servidor de Next.js no puede leer (ver comentario en lib/api.ts), así que
// la única forma de saber "quién sos" es preguntarle a la API desde el
// browser. La autorización real la sigue haciendo la API en cada endpoint
// (SessionAuthGuard) — esto es solo la redirección de UX.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SafeUser | null | 'loading'>('loading');

  useEffect(() => {
    getMe().then((me) => {
      if (!me) {
        router.replace('/login');
        return;
      }
      setUser(me);
    });
  }, [router]);

  if (user === 'loading' || user === null) {
    return null;
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/15">
        <nav className="flex gap-5 text-sm">
          <Link href="/panel" className={navLink(pathname === '/panel')}>
            Mis propiedades
          </Link>
          <Link href="/panel/leads" className={navLink(pathname === '/panel/leads')}>
            Leads
          </Link>
          {(user.role === 'FRANCHISE_ADMIN' || (user.role === 'ADVISOR' && !user.franchiseId)) && (
            <Link href="/panel/comprar" className={navLink(pathname === '/panel/comprar')}>
              Comprar paquete
            </Link>
          )}
          {user.role === 'FRANCHISE_ADMIN' && (
            <>
              <Link href="/panel/equipo" className={navLink(pathname === '/panel/equipo')}>
                Equipo
              </Link>
              <Link href="/panel/bajas" className={navLink(pathname === '/panel/bajas')}>
                Bajas
              </Link>
            </>
          )}
          {user.role === 'SUPER_ADMIN' && (
            <>
              <Link href="/panel/pagos" className={navLink(pathname === '/panel/pagos')}>
                Pagos
              </Link>
              <Link href="/panel/catalogo" className={navLink(pathname === '/panel/catalogo')}>
                Catálogo
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-70">{user.fullName}</span>
          <button onClick={handleLogout} className={buttonSecondarySm}>
            Cerrar sesión
          </button>
        </div>
      </header>
      {children}
    </main>
  );
}
