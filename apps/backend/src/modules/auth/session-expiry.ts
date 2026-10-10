const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Sin ninguna petición autenticada durante este tiempo, la sesión vence (RF-auth-05). */
export const SESSION_IDLE_TIMEOUT_MS = 7 * DAY_MS;

/** Desde el login, la sesión vence pasado este tiempo aunque se use todos los días (RF-auth-05). */
export const SESSION_ABSOLUTE_TIMEOUT_MS = 30 * DAY_MS;

/** Se renueva como mucho una vez cada este tiempo: acota las escrituras a la base. */
export const SESSION_RENEW_INTERVAL_MS = 5 * MINUTE_MS;

export interface SessionClock {
  lastUsedAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
}

export function computeAbsoluteExpiry(loginAt: Date): Date {
  return new Date(loginAt.getTime() + SESSION_ABSOLUTE_TIMEOUT_MS);
}

/** Vigente si no se revocó, no pasó el límite por inactividad ni el absoluto. */
export function isSessionActive(session: SessionClock, now: Date): boolean {
  if (session.revokedAt !== null) return false;
  if (now.getTime() - session.lastUsedAt.getTime() > SESSION_IDLE_TIMEOUT_MS) return false;
  return now.getTime() <= session.absoluteExpiresAt.getTime();
}

export function shouldRenewSession(session: SessionClock, now: Date): boolean {
  return now.getTime() - session.lastUsedAt.getTime() > SESSION_RENEW_INTERVAL_MS;
}

/**
 * Hasta cuándo vale un token emitido con último uso `lastUsedAt`: el límite por inactividad, sin
 * pasar del absoluto. Es también el `Max-Age` de la cookie.
 */
export function computeTokenExpiry(lastUsedAt: Date, absoluteExpiresAt: Date): Date {
  const idleExpiry = lastUsedAt.getTime() + SESSION_IDLE_TIMEOUT_MS;
  return new Date(Math.min(idleExpiry, absoluteExpiresAt.getTime()));
}
