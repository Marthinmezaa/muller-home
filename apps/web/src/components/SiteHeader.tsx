import Image from 'next/image';
import Link from 'next/link';
import { accentText } from '@/lib/ui';

/** Header de marca, presente en toda la app (portal público y panel) — ver root layout.tsx. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-background/80 backdrop-blur-md dark:border-white/15">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 p-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/owl-mark.png"
            alt=""
            width={32}
            height={32}
            className="rounded-full ring-1 ring-black/10 dark:ring-white/15"
          />
          <span className={`text-lg font-semibold tracking-tight ${accentText}`}>Muller Home</span>
        </Link>
      </div>
    </header>
  );
}
