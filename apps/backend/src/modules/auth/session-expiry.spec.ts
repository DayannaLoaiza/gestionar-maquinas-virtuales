import {
  computeAbsoluteExpiry,
  computeTokenExpiry,
  isSessionActive,
  shouldRenewSession,
} from './session-expiry';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const LOGIN_AT = new Date('2026-10-01T12:00:00.000Z');

function at(offsetMs: number): Date {
  return new Date(LOGIN_AT.getTime() + offsetMs);
}

function sessionUsedAt(lastUsedAt: Date, revokedAt: Date | null = null) {
  return { lastUsedAt, absoluteExpiresAt: computeAbsoluteExpiry(LOGIN_AT), revokedAt };
}

describe('RF-auth-05 — expiración de la sesión (7 días sin uso, 30 desde el login)', () => {
  it('sigue vigente a los 7 días menos 1 minuto sin uso', () => {
    expect(isSessionActive(sessionUsedAt(LOGIN_AT), at(7 * DAY_MS - MINUTE_MS))).toBe(true);
  });

  it('vence a los 7 días más 1 minuto sin uso', () => {
    expect(isSessionActive(sessionUsedAt(LOGIN_AT), at(7 * DAY_MS + MINUTE_MS))).toBe(false);
  });

  it('vence a los 30 días del login aunque se haya usado hace un minuto', () => {
    const usedYesterday = sessionUsedAt(at(30 * DAY_MS - MINUTE_MS));

    expect(isSessionActive(usedYesterday, at(30 * DAY_MS))).toBe(true);
    expect(isSessionActive(usedYesterday, at(30 * DAY_MS + MINUTE_MS))).toBe(false);
  });

  it('una sesión revocada no está vigente aunque no haya vencido', () => {
    expect(isSessionActive(sessionUsedAt(LOGIN_AT, LOGIN_AT), at(MINUTE_MS))).toBe(false);
  });

  it('la renovación extiende 7 días desde el último uso sin pasar del límite absoluto', () => {
    const absoluteExpiresAt = computeAbsoluteExpiry(LOGIN_AT);

    expect(computeTokenExpiry(at(DAY_MS), absoluteExpiresAt)).toEqual(at(8 * DAY_MS));
    expect(computeTokenExpiry(at(28 * DAY_MS), absoluteExpiresAt)).toEqual(at(30 * DAY_MS));
  });

  it('renueva solo cuando pasaron más de 5 minutos desde el último uso', () => {
    const session = sessionUsedAt(LOGIN_AT);

    expect(shouldRenewSession(session, at(5 * MINUTE_MS))).toBe(false);
    expect(shouldRenewSession(session, at(5 * MINUTE_MS + 1))).toBe(true);
  });
});
