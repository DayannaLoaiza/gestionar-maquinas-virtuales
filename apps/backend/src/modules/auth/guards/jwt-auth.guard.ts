import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthService } from '@/modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorator';
import { SessionCookieService } from '@/modules/auth/session-cookie.service';
import { UnauthenticatedException } from '@/shared/exceptions/auth.exceptions';

import type { AuthenticatedRequest } from '@/modules/auth/authenticated-request';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Global: toda ruta exige sesión salvo las `@Public()` (RF-auth-06). El token se lee **solo** de la
 * cookie `HttpOnly`; uno en `Authorization`, el cuerpo o la query se ignora. Si la sesión se
 * renovó, reemite la cookie (RF-auth-05).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly sessionCookie: SessionCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const token = this.sessionCookie.read(request);
    if (!token) throw new UnauthenticatedException();

    const session = await this.authService.authenticate(token);
    if (session.renewedToken) {
      this.sessionCookie.set(http.getResponse<Response>(), session.renewedToken);
    }
    request.user = session.user;
    request.sessionId = session.sessionId;
    return true;
  }
}
