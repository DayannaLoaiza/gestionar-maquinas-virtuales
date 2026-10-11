'use client';

import { createContext, useState } from 'react';

import { createAuthStore } from '@/lib/auth/auth-store';

import type { AuthStoreApi } from '@/lib/auth/auth-store';
import type { AuthUser } from '@vm/shared-types';
import type { ReactNode } from 'react';

export const AuthStoreContext = createContext<AuthStoreApi | null>(null);

/**
 * Da a su árbol un store de autenticación propio, creado una vez por montaje (guía de Zustand para
 * Next.js): en el servidor, uno por pedido (RF-auth-23). Nace con el usuario que el servidor ya
 * verificó, así el primer HTML sale con el rol correcto (RF-auth-30) y no hay pedidos extra.
 */
export function AuthProvider({
  initialUser,
  children,
}: Readonly<{ initialUser: AuthUser | null; children: ReactNode }>) {
  const [store] = useState(() => createAuthStore(initialUser));
  return <AuthStoreContext value={store}>{children}</AuthStoreContext>;
}
