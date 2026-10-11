'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_SECTIONS, isCurrentSection } from '@/config/navigation';
import { cn } from '@/lib/utils';

export interface NavLinksProps {
  /** Se llama al navegar a una sección; el menú móvil lo usa para cerrarse. */
  onNavigate?: () => void;
}

/**
 * Lista de secciones de `NAV_SECTIONS` (RF-app-shell-02). La actual lleva `aria-current="page"` y
 * la línea vertical azul → cian en el borde de la barra.
 */
export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {NAV_SECTIONS.map(({ href, label, icon: Icon }) => {
        const isActive = isCurrentSection(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onNavigate={() => onNavigate?.()}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-muted text-foreground before:absolute before:inset-y-2 before:-left-3 before:w-0.5 before:rounded-full before:bg-linear-to-b before:from-primary-500 before:to-secondary-500'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
