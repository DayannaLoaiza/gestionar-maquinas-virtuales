import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from './user.entity';

import type { Role } from '@vm/shared-types';

export interface NewUserRow {
  email: string;
  passwordHash: string;
  role: Role;
}

/** Única capa que sabe dónde viven los usuarios (C7). Recibe el email ya normalizado. */
@Injectable()
export class UserRepository {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOneBy({ email });
  }

  /**
   * `INSERT … ON CONFLICT DO NOTHING`: si el email ya existe no cambia nada. Es atómico, así que
   * dos inserciones simultáneas del mismo email no pueden crear dos usuarios.
   *
   * @returns si se creó la fila.
   */
  async insertIfAbsent(row: NewUserRow): Promise<boolean> {
    const result = await this.users
      .createQueryBuilder()
      .insert()
      .into(UserEntity)
      .values(row)
      .orIgnore()
      .execute();
    // En PostgreSQL, `raw` son las filas de `RETURNING`: vacío si el conflicto no insertó nada.
    const insertedRows: unknown = result.raw;
    return Array.isArray(insertedRows) && insertedRows.length > 0;
  }
}
