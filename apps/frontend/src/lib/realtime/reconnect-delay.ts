const FIRST_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

/**
 * La espera antes del reintento número `attempt` (desde 0) tras un rechazo del handshake que no es
 * de sesión: 1, 2, 4, 8 y 16 s, y después 30 s (RF-realtime-vm-status-16).
 */
export function nextReconnectDelay(attempt: number): number {
  return Math.min(FIRST_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
}
