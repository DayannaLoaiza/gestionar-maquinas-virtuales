'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/components/auth/use-auth-store';

/**
 * Quien llega a `/login` desde un enlace de otro sitio con la sesión vigente no mandó la cookie en
 * esa navegación (`SameSite=Strict`). Este pedido sale de la propia página, así que sí la manda: si
 * la sesión vale, lleva al Panel (RF-auth-21). Un `401` acá solo significa que no hay sesión, no que
 * expiró (RF-auth-26). No pinta nada.
 */
export function LoginSessionCheck(): null {
  const router = useRouter();
  const checkSession = useAuthStore((state) => state.checkSession);

  useEffect(() => {
    let isMounted = true;
    checkSession({ onUnauthorized: 'ignore' })
      .then((user) => {
        if (isMounted && user !== null) router.replace('/');
      })
      .catch(() => {
        // Sin respuesta de la API, el formulario sigue disponible: no hay nada que hacer.
      });
    return () => {
      isMounted = false;
    };
  }, [checkSession, router]);

  return null;
}
