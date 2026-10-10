import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { SessionEntity } from './session.entity';

export interface NewSessionRow {
  userId: string;
  lastUsedAt: Date;
  absoluteExpiresAt: Date;
}

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(SessionEntity) private readonly sessions: Repository<SessionEntity>,
  ) {}

  create(row: NewSessionRow): Promise<SessionEntity> {
    return this.sessions.save(this.sessions.create({ ...row, revokedAt: null }));
  }

  /** La sesión con su usuario, en una sola consulta: el guard la pide en cada petición. */
  findWithUser(sessionId: string): Promise<SessionEntity | null> {
    return this.sessions.findOne({ where: { id: sessionId }, relations: { user: true } });
  }

  async touch(sessionId: string, usedAt: Date): Promise<void> {
    await this.sessions.update({ id: sessionId }, { lastUsedAt: usedAt });
  }

  /** Revoca solo si sigue vigente: revocar dos veces no cambia la fecha original. */
  async revoke(sessionId: string, userId: string, revokedAt: Date): Promise<void> {
    await this.sessions.update({ id: sessionId, userId, revokedAt: IsNull() }, { revokedAt });
  }
}
