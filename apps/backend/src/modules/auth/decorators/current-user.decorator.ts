import { createParamDecorator } from '@nestjs/common';

import { UnauthenticatedException } from '@/shared/exceptions/auth.exceptions';

import type { AuthenticatedRequest } from '@/modules/auth/authenticated-request';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@vm/shared-types';

/** El usuario de la sesión. Solo en rutas protegidas: en una `@Public()` no hay sesión. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) throw new UnauthenticatedException();
    return user;
  },
);
