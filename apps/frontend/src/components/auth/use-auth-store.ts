'use client';

import { useContext } from 'react';
import { useStore } from 'zustand';

import { AuthStoreContext } from './auth-provider';

import type { AuthStore } from '@/lib/auth/auth-store';

/**
 * Lee el estado de autenticación con un selector (`selectUser`, `selectRole`,
 * `selectIsAuthenticated`) o toma una acción (`state.login`, `state.logout`, `state.checkSession`).
 */
export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  const store = useContext(AuthStoreContext);
  if (store === null) throw new Error('useAuthStore se usa dentro de un AuthProvider');
  return useStore(store, selector);
}
