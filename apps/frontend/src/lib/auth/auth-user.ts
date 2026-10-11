import { ROLES, ROLE_VALUES } from '@vm/shared-types';

import type { AuthUser, Role } from '@vm/shared-types';

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLE_VALUES.some((role) => role === value);
}

/**
 * Valida en tiempo de ejecución lo que la API dice que es un `AuthUser`: el tipo de TypeScript no
 * alcanza, porque `fetch-wrapper` y `serverFetch` no validan `data`. Un rol fuera de `ROLES` no
 * pasa (RF-auth-22: falla cerrado).
 */
export function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('email' in value) || !('role' in value)) return false;
  const { id, email, role } = value;
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    typeof email === 'string' &&
    email.length > 0 &&
    isRole(role)
  );
}

/**
 * El usuario de una respuesta `{ user }` (login o `/me`) si tiene la forma de `AuthUser`; si no,
 * `null`. Copia solo `id`, `email` y `role`: un campo que la API agregara no llega al estado ni al
 * payload que el servidor manda al navegador (RF-auth-22).
 */
export function readAuthUser(data: unknown): AuthUser | null {
  if (typeof data !== 'object' || data === null || !('user' in data)) return null;
  if (!isAuthUser(data.user)) return null;
  const { id, email, role } = data.user;
  return { id, email, role };
}

/** Sin usuario o con cualquier rol que no sea Administrador, no hay permisos de escritura (RF-auth-30). */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === ROLES.ADMIN;
}
