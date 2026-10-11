'use client';

import { ROLES } from '@vm/shared-types';

import { selectRole } from '@/lib/auth/auth-store';

import { useAuthStore } from './use-auth-store';

import type { ReactNode } from 'react';

/**
 * Renderiza su contenido solo para un Administrador (RF-auth-30): para un Cliente, un rol
 * desconocido o sin usuario, el control **no existe** en el DOM, ni en el HTML del servidor (el
 * store nace con el usuario verificado). No se oculta con CSS ni se deshabilita. La UI oculta; la
 * API decide (RF-virtual-machines-02).
 *
 * Solo dentro de un árbol de Client Components. Desde un Server Component, sus `children` viajarían
 * en el payload RSC del Cliente aunque no se rendericen: ahí va `isAdmin(await requireUser()) &&
 * <Control />`.
 *
 * @example
 * <AdminOnly>
 *   <Button>Crear máquina virtual</Button>
 * </AdminOnly>
 */
export function AdminOnly({ children }: Readonly<{ children: ReactNode }>) {
  const role = useAuthStore(selectRole);
  return role === ROLES.ADMIN && children;
}
