import Link from 'next/link';

import { Stack2 } from '@/components/svg/stack-2';

/** Nombre del producto en la interfaz. */
export const PRODUCT_NAME = 'Gestor de VMs';

/**
 * Marca: el degradado azul → cian (el único gesto de color del shell) con el ícono de capas, y el
 * nombre en ancho semi-expandido. Sin enlace, para usarla como título (p. ej., del menú móvil).
 */
export function BrandLogo() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-primary-500 to-secondary-500 text-white">
        <Stack2 className="size-5" />
      </span>
      <span className="text-base font-semibold tracking-tight text-foreground font-stretch-semi-expanded">
        {PRODUCT_NAME}
      </span>
    </span>
  );
}

/** La marca como enlace al Panel (RF-app-shell-02). */
export function Brand() {
  return (
    <Link href="/" className="rounded-md">
      <BrandLogo />
    </Link>
  );
}
