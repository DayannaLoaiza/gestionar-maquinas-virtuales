import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccessDeniedException } from '@/shared/exceptions/auth.exceptions';
import { isOriginAllowed } from '@/shared/utils/origin.util';

import type { Env } from '@/config/env.validation';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Defensa CSRF en profundidad junto a `SameSite=Strict` (OWASP CSRF Prevention, RF-auth-11): una
 * petición que cambia estado con un `Origin` fuera de `CORS_ORIGIN` no se ejecuta. La regla (y por
 * qué se acepta la falta de `Origin`) está en `isOriginAllowed`.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly logger = new Logger(OriginGuard.name);
  private readonly allowedOrigins: ReadonlySet<string>;

  constructor(config: ConfigService<Env, true>) {
    this.allowedOrigins = new Set(config.get('CORS_ORIGIN', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!STATE_CHANGING_METHODS.has(request.method)) return true;

    if (isOriginAllowed(request.headers.origin, this.allowedOrigins)) return true;

    this.logger.warn(
      `Origen rechazado: ${request.method} ${request.path} (ip=${request.ip ?? '-'})`,
    );
    throw new AccessDeniedException();
  }
}
