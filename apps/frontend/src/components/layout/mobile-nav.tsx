'use client';

import { useEffect, useState } from 'react';

import { Menu2 } from '@/components/svg/menu-2';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MAIN_NAV_LABEL } from '@/config/navigation';

import { BrandLogo } from './brand';
import { NavLinks } from './nav-links';

/** Igual al breakpoint `lg` de Tailwind: desde ahí la barra lateral es fija. */
const DESKTOP_QUERY = '(min-width: 64rem)';

/**
 * Navegación en pantallas angostas (RF-app-shell-04): el botón "Abrir menú" abre la barra lateral
 * como panel superpuesto. `Sheet` (Radix) retiene el foco, cierra con `Esc` o con un clic fuera y
 * devuelve el foco al botón. Además se cierra al elegir una sección y si la ventana pasa a
 * escritorio, donde queda la barra fija.
 */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const closeOnDesktop = (event: MediaQueryListEvent): void => {
      if (event.matches) setIsOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Abrir menú">
          <Menu2 className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 gap-0"
        closeLabel="Cerrar menú"
        aria-describedby={undefined}
      >
        <SheetHeader className="h-14 justify-center border-b border-border px-6 py-0">
          <SheetTitle>
            <BrandLogo />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label={MAIN_NAV_LABEL} className="px-3 py-4">
          <NavLinks
            onNavigate={() => {
              setIsOpen(false);
            }}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
