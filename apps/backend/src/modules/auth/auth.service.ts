import { randomBytes } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { UsersService } from '@/modules/users/users.service';
import {
  InvalidCredentialsException,
  UnauthenticatedException,
} from '@/shared/exceptions/auth.exceptions';

import { hashPassword, verifyPassword } from './password-hasher';
import {
  computeAbsoluteExpiry,
  computeTokenExpiry,
  isSessionActive,
  shouldRenewSession,
} from './session-expiry';
import { SessionTokenService } from './session-token.service';
import { SessionRepository } from './session.repository';

import type { IssuedToken } from './session-token.service';
import type { SessionEntity } from './session.entity';
import type { UserEntity } from '@/modules/users/user.entity';
import type { OnModuleInit } from '@nestjs/common';
import type { AuthUser, LoginDTO } from '@vm/shared-types';

export interface LoginResult {
  user: AuthUser;
  issuedToken: IssuedToken;
}

export interface AuthenticatedSession {
  user: AuthUser;
  sessionId: string;
  /** Token nuevo si la sesión se renovó en esta petición (RF-auth-05); si no, `null`. */
  renewedToken: IssuedToken | null;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  /** Hash de una contraseña aleatoria: se verifica contra él cuando el email no existe (RF-auth-02). */
  private dummyPasswordHash = '';

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionTokens: SessionTokenService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyPasswordHash = await hashPassword(randomBytes(32).toString('base64url'));
  }

  /**
   * Las tres fallas (email inexistente, usuario inactivo, contraseña incorrecta) pagan la misma
   * verificación Argon2 y terminan en la misma excepción: ni el mensaje ni el tiempo dicen si la
   * cuenta existe (RF-auth-02).
   */
  async login(credentials: LoginDTO, clientIp: string): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(credentials.email);
    const passwordHash = user?.passwordHash ?? this.dummyPasswordHash;
    const isPasswordValid = await verifyPassword(passwordHash, credentials.password);

    if (!user || !user.isActive || !isPasswordValid) {
      this.logger.warn(`Login fallido: ${describeFailure(user)} (ip=${clientIp})`);
      throw new InvalidCredentialsException();
    }

    const now = new Date();
    const session = await this.sessionRepository.create({
      userId: user.id,
      lastUsedAt: now,
      absoluteExpiresAt: computeAbsoluteExpiry(now),
    });
    const issuedToken = await this.issueToken(session, now);
    this.logger.log(`Login correcto (userId=${user.id}, ip=${clientIp})`);
    return { user: this.usersService.toAuthUser(user), issuedToken };
  }

  /** Valida el token y su sesión en la base; renueva si toca (RF-auth-05, RF-auth-06). */
  async authenticate(token: string): Promise<AuthenticatedSession> {
    const reference = await this.sessionTokens.read(token);
    if (!reference) throw new UnauthenticatedException();

    const session = await this.sessionRepository.findWithUser(reference.sessionId);
    const now = new Date();
    if (session?.userId !== reference.userId) throw new UnauthenticatedException();
    if (!session.user.isActive || !isSessionActive(session, now)) {
      throw new UnauthenticatedException();
    }

    const renewedToken = shouldRenewSession(session, now) ? await this.renew(session, now) : null;
    return {
      user: this.usersService.toAuthUser(session.user),
      sessionId: session.id,
      renewedToken,
    };
  }

  /** Revoca la sesión del token si es válido. Sin token o con uno inválido no hace nada (RF-auth-08). */
  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const reference = await this.sessionTokens.read(token);
    if (!reference) return;

    await this.sessionRepository.revoke(reference.sessionId, reference.userId, new Date());
    this.logger.log(`Logout (userId=${reference.userId})`);
  }

  private async renew(session: SessionEntity, now: Date): Promise<IssuedToken> {
    await this.sessionRepository.touch(session.id, now);
    return this.issueToken(session, now);
  }

  private issueToken(session: SessionEntity, lastUsedAt: Date): Promise<IssuedToken> {
    return this.sessionTokens.issue(
      { sessionId: session.id, userId: session.userId },
      computeTokenExpiry(lastUsedAt, session.absoluteExpiresAt),
    );
  }
}

/** Motivo para el log (RNF-auth-06): con id de usuario si se conoce, nunca el email. */
function describeFailure(user: UserEntity | null): string {
  if (!user) return 'usuario inexistente';
  if (!user.isActive) return `usuario inactivo, userId=${user.id}`;
  return `contraseña incorrecta, userId=${user.id}`;
}
