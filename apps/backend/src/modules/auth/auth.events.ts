/**
 * Eventos internos de `auth` (`EventEmitter2`): no salen de la API. `auth` solo anuncia lo que pasó;
 * los escucha `realtime`, sin que `auth` dependa de él.
 */
export const AUTH_EVENTS = {
  SESSION_REVOKED: 'auth.session-revoked',
} as const;

/** El logout revocó la sesión: sus conexiones de tiempo real se cierran (RF-realtime-vm-status-08). */
export interface SessionRevokedEvent {
  sessionId: string;
  userId: string;
}
