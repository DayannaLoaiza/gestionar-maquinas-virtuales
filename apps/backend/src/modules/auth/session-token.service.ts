import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

/** Algoritmo único: `verify` rechaza cualquier otro, incluido `none` (OWASP JWT Cheat Sheet). */
export const JWT_ALGORITHM = 'HS256';
export const JWT_ISSUER = 'vm-api';
export const JWT_AUDIENCE = 'vm-web';

/** El token solo referencia la sesión (`jti`) y su usuario (`sub`); la verdad está en la base. */
const SessionTokenClaims = z.object({ sub: z.uuid(), jti: z.uuid() });

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

export interface SessionReference {
  sessionId: string;
  userId: string;
}

@Injectable()
export class SessionTokenService {
  private readonly logger = new Logger(SessionTokenService.name);

  constructor(private readonly jwtService: JwtService) {}

  async issue(reference: SessionReference, expiresAt: Date): Promise<IssuedToken> {
    const token = await this.jwtService.signAsync({
      sub: reference.userId,
      jti: reference.sessionId,
      exp: Math.floor(expiresAt.getTime() / 1000),
    });
    return { token, expiresAt };
  }

  /** `null` si la firma, el algoritmo, el emisor, la audiencia, la expiración o los claims fallan. */
  async read(token: string): Promise<SessionReference | null> {
    let payload: unknown;
    try {
      payload = await this.jwtService.verifyAsync<object>(token);
    } catch (error) {
      this.logger.debug(`Token rechazado: ${error instanceof Error ? error.name : 'desconocido'}`);
      return null;
    }

    const claims = SessionTokenClaims.safeParse(payload);
    if (!claims.success) return null;
    return { sessionId: claims.data.jti, userId: claims.data.sub };
  }
}
