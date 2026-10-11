import 'server-only';

import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import { serverFetchResult } from '@/lib/api/server-fetch';
import { isAdmin, readAuthUser } from '@/lib/auth/auth-user';

import type { AuthUser } from '@vm/shared-types';

const UNAUTHORIZED = 401;

type SessionLookup =
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'anonymous' }
  | { status: 'unavailable'; httpStatus: number };

/**
 * La sesión del pedido según la API (`GET /api/auth/me`, con las cookies del pedido). `cache()` hace
 * que el layout y la página de un mismo pedido compartan una sola llamada. Una respuesta sin la
 * forma de `AuthUser` cuenta como sin sesión: falla cerrado (RF-auth-22).
 */
export const getCurrentUser = cache(async (): Promise<SessionLookup> => {
  const result = await serverFetchResult<unknown>('/api/auth/me');
  if (!result.ok) {
    if (result.status === UNAUTHORIZED) return { status: 'anonymous' };
    return { status: 'unavailable', httpStatus: result.status };
  }
  const user = readAuthUser(result.data);
  return user === null ? { status: 'anonymous' } : { status: 'authenticated', user };
});

/**
 * El usuario de la sesión, o la redirección a `/login` si no hay una válida (RF-auth-25). Si la API
 * no responde, lanza: lo atrapa `app/error.tsx`, nunca el login (RF-auth-24).
 *
 * Va en la primera línea de **cada** página del panel, no solo en el layout: un layout no se vuelve
 * a renderizar al navegar (guía de autenticación de Next 16). Lo exige `session-guard.test.ts`.
 */
export async function requireUser(): Promise<AuthUser> {
  const session = await getCurrentUser();
  if (session.status === 'authenticated') return session.user;
  if (session.status === 'anonymous') redirect('/login');
  throw new Error(`No se pudo verificar la sesión (${String(session.httpStatus)})`);
}

/**
 * Para las páginas solo de Administrador: a un Cliente le responde la 404, "no existe o no tienes
 * acceso" (RF-auth-31).
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();
  return user;
}
