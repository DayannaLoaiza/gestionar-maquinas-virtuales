import { LayoutDashboard } from '@/components/svg/layout-dashboard';

import type { Route } from 'next';
import type { ComponentType, SVGProps } from 'react';

export interface NavSection {
  /** `Route` de `typedRoutes`: una sección cuya página no existe no compila. */
  href: Route;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Nombre accesible de la región de navegación (RF-app-shell-13). */
export const MAIN_NAV_LABEL = 'Navegación principal';

/**
 * Secciones de la barra lateral, en orden (RF-app-shell-02). Solo las que existen: cada capacidad
 * agrega la suya al crear su página.
 */
export const NAV_SECTIONS = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
] as const satisfies readonly NavSection[];

/** `/` solo está activa en `/`; las demás secciones también en sus subrutas (`/vms/nueva`). */
export function isCurrentSection(pathname: string, href: Route): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
