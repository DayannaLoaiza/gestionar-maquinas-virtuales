import { Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '@/modules/auth/decorators/roles.decorator';
import { AccessDeniedException } from '@/shared/exceptions/auth.exceptions';

import type { AuthenticatedRequest } from '@/modules/auth/authenticated-request';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Role } from '@vm/shared-types';

/**
 * Global, después de `JwtAuthGuard`: si la ruta declara `@Roles(...)`, el rol del usuario (leído
 * de la base en cada petición, no del token) tiene que estar entre ellos (RF-auth-07).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user && allowedRoles.includes(request.user.role)) return true;

    this.logger.warn(
      `Acceso denegado por rol: ${request.method} ${request.path} (userId=${request.user?.id ?? '-'}, ip=${request.ip ?? '-'})`,
    );
    throw new AccessDeniedException();
  }
}
