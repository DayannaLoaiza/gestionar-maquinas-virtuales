import { createStore } from 'zustand/vanilla';

import { ApiError } from '@/lib/api/api-error';
import { get, post } from '@/lib/api/fetch-wrapper';
import { readAuthUser } from '@/lib/auth/auth-user';
import { announceSessionChange } from '@/lib/auth/session-channel';
import { goToLogin } from '@/lib/auth/session-navigation';

import type { RequestOptions } from '@/lib/api/fetch-wrapper';
import type { AuthUser, LoginDTO, Role } from '@vm/shared-types';

const UNAUTHORIZED = 401;

export interface AuthState {
  /** El usuario de la sesión, tal como lo devolvió la API, o `null` si no hay sesión. */
  user: AuthUser | null;
}

export interface AuthActions {
  /** `POST /api/auth/login`. Lanza si falla; el estado solo cambia con una respuesta válida. */
  login: (credentials: LoginDTO) => Promise<AuthUser>;
  /** `POST /api/auth/logout` y carga completa de `/login`. Si falla, lanza sin tocar nada. */
  logout: () => Promise<void>;
  /** `GET /api/auth/me`. Un `401` deja el estado sin usuario; cualquier otra falla lanza. */
  checkSession: (options?: RequestOptions) => Promise<AuthUser | null>;
}

export type AuthStore = AuthState & AuthActions;

async function requestLogin(credentials: LoginDTO): Promise<AuthUser> {
  const user = readAuthUser(await post<unknown>('/api/auth/login', credentials));
  if (user === null) throw new Error('La respuesta del login no trae un usuario válido');
  return user;
}

/**
 * Estado global de autenticación (RF-auth-22): solo el usuario, solo en memoria (sin `persist`). El
 * token nunca pasa por acá: viaja en la cookie `HttpOnly`. Se crea uno por `AuthProvider`, nunca como
 * módulo global, para que en el servidor de Next dos pedidos no compartan usuario (RF-auth-23).
 */
export function createAuthStore(initialUser: AuthUser | null = null) {
  /** Un login a la vez: un segundo envío mientras el primero sigue en curso lo reutiliza (RF-auth-19). */
  let pendingLogin: Promise<AuthUser> | null = null;

  return createStore<AuthStore>()((set) => ({
    user: initialUser,

    login(credentials) {
      pendingLogin ??= requestLogin(credentials)
        .then((user) => {
          set({ user });
          announceSessionChange();
          return user;
        })
        .finally(() => {
          pendingLogin = null;
        });
      return pendingLogin;
    },

    async logout() {
      await post('/api/auth/logout');
      announceSessionChange();
      goToLogin('sesion-cerrada');
    },

    async checkSession(options) {
      try {
        const user = readAuthUser(await get<unknown>('/api/auth/me', options));
        set({ user });
        return user;
      } catch (error: unknown) {
        if (!(error instanceof ApiError) || error.status !== UNAUTHORIZED) throw error;
        set({ user: null });
        return null;
      }
    },
  }));
}

export type AuthStoreApi = ReturnType<typeof createAuthStore>;

export const selectUser = (state: AuthStore): AuthUser | null => state.user;
export const selectRole = (state: AuthStore): Role | null => state.user?.role ?? null;
/** Derivado del usuario, nunca guardado aparte: no puede contradecirlo (RF-auth-22). */
export const selectIsAuthenticated = (state: AuthStore): boolean => state.user !== null;
