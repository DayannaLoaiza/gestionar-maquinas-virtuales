import { SetMetadata } from '@nestjs/common';

import type { Role } from '@vm/shared-types';

export const ROLES_KEY = 'auth:roles';

/**
 * Restringe la ruta a los roles listados (RF-auth-07). Siempre con la constante:
 * `@Roles(ROLES.ADMIN)`, nunca el string.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
