import { get } from '@/lib/api/fetch-wrapper';

/**
 * Verifica la sesión tras un cierre del socket por el servidor (RF-realtime-vm-status-15):
 * `GET /api/auth/me`. Con `401`, `fetch-wrapper` lleva a `/login` con el aviso de sesión expirada
 * (RF-auth-26) y la promesa se rechaza.
 */
export async function checkRealtimeSession(): Promise<void> {
  await get('/api/auth/me');
}
