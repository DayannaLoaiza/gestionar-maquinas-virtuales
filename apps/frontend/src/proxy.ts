import { NextResponse } from 'next/server';

import { checkSession, shouldGoToPanel } from '@/lib/auth/proxy-session';

import type { NextRequest } from 'next/server';

/**
 * Corre antes de cada página (runtime Node, el de Next 16). Con cookie, pregunta a la API por la
 * sesión para dos cosas:
 * - reenviar al navegador la renovación de la cookie (RF-auth-27);
 * - llevar al Panel a quien abre `/login` con sesión válida (RF-auth-21).
 *
 * A propósito **no** protege rutas: eso lo hace `requireUser()` en cada página (RF-auth-25), porque
 * `proxy` no debe ser la única defensa. Tampoco le pasa el usuario a la página: si `proxy` se
 * salteara, esa cabecera la podría mandar cualquiera.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return NextResponse.next();

  const check = await checkSession(cookie);
  const response = shouldGoToPanel(request.nextUrl.pathname, check)
    ? NextResponse.redirect(new URL('/', request.url))
    : NextResponse.next();
  for (const setCookie of check?.setCookies ?? []) response.headers.append('set-cookie', setCookie);
  return response;
}

export const config = {
  matcher: [
    {
      // Solo páginas: ni la API (el rewrite), ni los estáticos, ni archivos con extensión.
      source: '/((?!api/|_next/static|_next/image|.*\\..*).*)',
      // Los prefetch no llaman a la API (doc de `proxy` de Next 16, "Matcher").
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
