'use client';

import { useEffect } from 'react';

import { subscribeSessionChange } from '@/lib/auth/session-channel';

/**
 * Cuando otra pestaña inicia o cierra sesión, esta se recarga y vuelve a verificar con la API: con
 * la sesión nueva muestra al usuario nuevo; sin sesión, termina en `/login` (RF-auth-33). Va una sola
 * vez, en el layout raíz, y no pinta nada.
 */
export function SessionSync(): null {
  useEffect(
    () =>
      subscribeSessionChange(() => {
        window.location.reload();
      }),
    [],
  );
  return null;
}
