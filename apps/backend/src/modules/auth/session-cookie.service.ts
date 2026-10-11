import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { IssuedToken } from './session-token.service';
import type { Env } from '@/config/env.validation';
import type { CookieOptions, Response } from 'express';
import type { IncomingMessage } from 'node:http';

/**
 * Con `Secure`, el prefijo `__Host-` obliga al navegador a aceptarla solo por HTTPS, sin `Domain` y
 * con `Path=/` (OWASP Session Management). Sin `Secure` el navegador rechaza ese prefijo, así que
 * el nombre cambia (solo fuera de producción: RF-auth-14).
 */
const SECURE_COOKIE_NAME = '__Host-vm_session';
const INSECURE_COOKIE_NAME = 'vm_session';

/** Lee, escribe y expira la cookie de sesión. El token nunca viaja por otro lado (RF-auth-01). */
@Injectable()
export class SessionCookieService {
  private readonly isSecure: boolean;
  private readonly name: string;

  constructor(config: ConfigService<Env, true>) {
    this.isSecure = config.get('COOKIE_SECURE', { infer: true });
    this.name = this.isSecure ? SECURE_COOKIE_NAME : INSECURE_COOKIE_NAME;
  }

  /**
   * Recibe la petición de Express o la del handshake de Socket.io: las dos pasan por `cookie-parser`
   * (RF-realtime-vm-status-03).
   */
  read(request: IncomingMessage): string | undefined {
    const cookies: unknown = 'cookies' in request ? request.cookies : undefined;
    if (typeof cookies !== 'object' || cookies === null) return undefined;
    const value: unknown = (cookies as Record<string, unknown>)[this.name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  set(response: Response, issued: IssuedToken): void {
    const maxAge = Math.max(0, issued.expiresAt.getTime() - Date.now());
    response.cookie(this.name, issued.token, { ...this.baseOptions(), maxAge });
  }

  clear(response: Response): void {
    response.clearCookie(this.name, this.baseOptions());
  }

  private baseOptions(): CookieOptions {
    return { httpOnly: true, secure: this.isSecure, sameSite: 'strict', path: '/' };
  }
}
