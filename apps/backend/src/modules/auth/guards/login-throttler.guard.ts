import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { TooManyAttemptsException } from '@/shared/exceptions/auth.exceptions';

import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Request, Response } from 'express';

/**
 * Rate limit del login (RF-auth-04): los throttlers `ip` y `email` de `AuthModule`. No es global:
 * se aplica solo a `POST /api/auth/login`.
 *
 * Con throttlers con nombre, `ThrottlerGuard` emite `Retry-After-<nombre>`, que ningún cliente
 * entiende: acá se pone el `Retry-After` estándar (segundos) y se lanza la excepción con el mensaje
 * para el usuario, dejando el log de seguridad (RNF-auth-06).
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(LoginThrottlerGuard.name);

  protected override throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    http.getResponse<Response>().setHeader('Retry-After', String(detail.timeToBlockExpire));

    this.logger.warn(
      `Login bloqueado por rate limit (ip=${request.ip ?? '-'}, intentos=${String(detail.totalHits)})`,
    );
    throw new TooManyAttemptsException();
  }
}
