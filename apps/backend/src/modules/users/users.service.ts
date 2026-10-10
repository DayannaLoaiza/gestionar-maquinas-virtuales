import { Injectable } from '@nestjs/common';

import { NormalizedEmail } from '@vm/shared-types';

import { hashPassword } from '@/modules/auth/password-hasher';

import { UserRepository } from './user.repository';

import type { UserEntity } from './user.entity';
import type { AuthUser, Role } from '@vm/shared-types';

export interface EnsureUserInput {
  email: string;
  password: string;
  role: Role;
}

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  /** Busca por email normalizado (recortado y en minúsculas), como se guarda (RF-auth-13). */
  findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(NormalizedEmail.parse(email));
  }

  /**
   * Crea el usuario si su email (normalizado) no existe; si existe, no lo toca. Lo usa el seed, que
   * así puede correr varias veces (RF-auth-15).
   *
   * @returns si se creó.
   */
  async ensureUser(input: EnsureUserInput): Promise<boolean> {
    const email = NormalizedEmail.parse(input.email);
    const passwordHash = await hashPassword(input.password);
    return this.userRepository.insertIfAbsent({ email, passwordHash, role: input.role });
  }

  /** Lo único que sale de la API sobre un usuario: nunca el hash ni los campos internos. */
  toAuthUser(user: UserEntity): AuthUser {
    return { id: user.id, email: user.email, role: user.role };
  }
}
