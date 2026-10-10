import request from 'supertest';
import { DataSource } from 'typeorm';

import { UsersService } from '@/modules/users/users.service';

import type { INestApplication } from '@nestjs/common';
import type { Role } from '@vm/shared-types';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

/** Nombre de la cookie con `COOKIE_SECURE=true`, el valor de los e2e. */
export const SESSION_COOKIE_NAME = '__Host-vm_session';

export interface TestUser {
  email: string;
  password: string;
  role: Role;
}

/** Crea el usuario como lo hace el seed; `isActive: false` lo desactiva después. */
export async function seedUser(
  app: INestApplication<App>,
  user: TestUser,
  options: { isActive?: boolean } = {},
): Promise<void> {
  await app.get(UsersService).ensureUser(user);
  if (options.isActive === false) await setUserActive(app, user.email, false);
}

export async function setUserActive(
  app: INestApplication<App>,
  email: string,
  isActive: boolean,
): Promise<void> {
  await app
    .get(DataSource)
    .query('UPDATE users SET is_active = $1 WHERE email = $2', [isActive, email.toLowerCase()]);
}

export function postLogin(
  app: INestApplication<App>,
  credentials: { email: string; password: string },
): request.Test {
  return request(app.getHttpServer()).post('/api/auth/login').send(credentials);
}

export function setCookieHeaders(response: Response): string[] {
  const header: unknown = response.headers['set-cookie'];
  if (Array.isArray(header)) return header.filter((value) => typeof value === 'string');
  return typeof header === 'string' ? [header] : [];
}

/** La línea `Set-Cookie` de la sesión, o `undefined` si la respuesta no la trae. */
export function sessionSetCookie(response: Response): string | undefined {
  return setCookieHeaders(response).find((value) => value.startsWith(`${SESSION_COOKIE_NAME}=`));
}

/** `nombre=valor` listo para mandar en la cabecera `Cookie`. */
export function sessionCookie(response: Response): string {
  const line = sessionSetCookie(response);
  if (!line) throw new Error('La respuesta no estableció la cookie de sesión');
  return line.split(';')[0] ?? '';
}

export function sessionToken(response: Response): string {
  return sessionCookie(response).slice(SESSION_COOKIE_NAME.length + 1);
}

/** Login correcto y la cookie de la sesión. */
export async function loginAs(app: INestApplication<App>, user: TestUser): Promise<string> {
  const response = await postLogin(app, user).expect(200);
  return sessionCookie(response);
}
