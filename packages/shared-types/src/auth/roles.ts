/** Roles del sistema: los únicos valores válidos, en la API y en la base. */
export const ROLES = {
  ADMIN: 'Administrador',
  CLIENT: 'Cliente',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_VALUES = Object.values(ROLES) as [Role, ...Role[]];
