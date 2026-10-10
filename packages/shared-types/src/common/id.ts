/** Identificador único (UUID v4). */
export type EntityId = string;

/** Fecha serializada en formato ISO 8601 (tal como viaja en JSON). */
export type IsoDateString = string;

/** Campos de auditoría comunes a todas las entidades. */
export interface Timestamps {
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
