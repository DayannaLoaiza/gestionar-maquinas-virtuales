import { readAuthUser } from '@/lib/auth/auth-user';
import { clientEnv } from '@/lib/env';

/** Más que esto y `proxy` deja de esperar: decide la página, que muestra el error si la API sigue caída. */
const SESSION_CHECK_TIMEOUT_MS = 5000;

const LOGIN_PATHNAME = '/login';

/** Lo que `proxy` necesita de `GET /api/auth/me`: si hay sesión y los `Set-Cookie` de una renovación. */
export interface SessionCheck {
  /** Respuesta `200` con un `AuthUser` válido: el mismo criterio que `requireUser()`. */
  hasSession: boolean;
  setCookies: string[];
}

function readUserFromEnvelope(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) return null;
  return payload.data;
}

/**
 * Pregunta a la API por la sesión con las cookies del pedido. Si la API la renovó (RF-auth-05),
 * trae el `Set-Cookie` que `proxy` reenvía al navegador (RF-auth-27): una renovación pedida desde
 * un Server Component se perdería. `null` si no hubo respuesta (red o tiempo agotado).
 */
export async function checkSession(cookie: string): Promise<SessionCheck | null> {
  try {
    const response = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/api/auth/me`, {
      cache: 'no-store',
      headers: { cookie },
      signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
    });
    const payload: unknown = response.ok ? await response.json().catch(() => null) : null;
    return {
      hasSession: readAuthUser(readUserFromEnvelope(payload)) !== null,
      setCookies: response.headers.getSetCookie(),
    };
  } catch {
    // Sin respuesta, `proxy` sigue sin redirigir: la página verifica por su cuenta (RF-auth-24).
    return null;
  }
}

/**
 * En `/login` con una sesión válida, `proxy` lleva al Panel (RF-auth-21). Valida igual que
 * `requireUser()`: si un `200` sin usuario válido bastara, `/login` y el Panel se mandarían uno al
 * otro sin fin.
 */
export function shouldGoToPanel(pathname: string, check: SessionCheck | null): boolean {
  return pathname === LOGIN_PATHNAME && check?.hasSession === true;
}
