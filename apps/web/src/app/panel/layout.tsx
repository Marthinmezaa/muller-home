'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getMe, logout } from '@/lib/api';
import type { SafeUser } from '@/lib/types';

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
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/15">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/panel" className={pathname === '/panel' ? 'text-[#3B3A72]' : 'opacity-70'}>
            Mis propiedades
          </Link>
          <Link href="/panel/leads" className={pathname === '/panel/leads' ? 'text-[#3B3A72]' : 'opacity-70'}>
            Leads
          </Link>
          {user.role === 'FRANCHISE_ADMIN' && (
            <>
              <Link href="/panel/equipo" className={pathname === '/panel/equipo' ? 'text-[#3B3A72]' : 'opacity-70'}>
                Equipo
              </Link>
              <Link href="/panel/bajas" className={pathname === '/panel/bajas' ? 'text-[#3B3A72]' : 'opacity-70'}>
                Bajas
              </Link>
            </>
          )}
          {user.role === 'SUPER_ADMIN' && (
            <>
              <Link href="/panel/pagos" className={pathname === '/panel/pagos' ? 'text-[#3B3A72]' : 'opacity-70'}>
                Pagos
              </Link>
              <Link href="/panel/catalogo" className={pathname === '/panel/catalogo' ? 'text-[#3B3A72]' : 'opacity-70'}>
                Catálogo
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-70">{user.fullName}</span>
          <button onClick={handleLogout} className="rounded border border-black/10 px-3 py-1 dark:border-white/15">
            Cerrar sesión
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
