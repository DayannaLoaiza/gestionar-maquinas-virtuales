import { LOGIN_NOTICE_PARAM } from '@/config/auth';

import type { LoginNotice } from '@/config/auth';

/**
 * Lleva a `/login` con una **carga completa** (hallazgo F3 de la spec): un documento nuevo descarta
 * el estado de autenticación, la caché del router de Next y toda copia de datos privados en memoria,
 * así que Atrás no recupera nada. `replace`: la página que se deja no queda en el historial. Es la
 * excepción documentada a "nunca `window.location`" de `forms-conventions.md`.
 */
export function goToLogin(notice: LoginNotice): void {
  if (typeof window === 'undefined') return;
  window.location.replace(`/login?${LOGIN_NOTICE_PARAM}=${notice}`);
}

/** Una por documento: la carga completa de `/login` la reinicia. */
let isSessionExpiredHandled = false;

/**
 * La sesión expiró en medio del uso (RF-auth-26). Varios `401` simultáneos producen una sola
 * redirección.
 */
export function handleSessionExpired(): void {
  if (isSessionExpiredHandled) return;
  isSessionExpiredHandled = true;
  goToLogin('sesion-expirada');
}
