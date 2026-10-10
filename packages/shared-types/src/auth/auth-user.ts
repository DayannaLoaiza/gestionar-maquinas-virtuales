import type { Role } from './roles';
import type { EntityId } from '../common/id';

/** Datos públicos del usuario con sesión: lo único que la API devuelve de él. */
export interface AuthUser {
  id: EntityId;
  email: string;
  role: Role;
}
