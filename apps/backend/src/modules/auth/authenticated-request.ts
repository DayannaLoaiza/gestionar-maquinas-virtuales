import type { AuthUser } from '@vm/shared-types';
import type { Request } from 'express';

/** Request después de `JwtAuthGuard`: en una ruta protegida, `user` y `sessionId` siempre están. */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sessionId?: string;
}
