/**
 * Avisos que muestra `/login` (spec `auth`, "Contratos visibles"). La URL lleva solo la clave
 * (`/login?aviso=sesion-expirada`): el texto sale de acá, nunca de la URL.
 */
export const LOGIN_NOTICES = {
  'sesion-expirada': 'Tu sesión expiró. Inicia sesión de nuevo',
  'sesion-cerrada': 'Cerraste sesión',
} as const;

export type LoginNotice = keyof typeof LOGIN_NOTICES;

export const LOGIN_NOTICE_PARAM = 'aviso';

/** Una clave desconocida o manipulada no muestra nada (caso límite de la spec). */
export function isLoginNotice(value: unknown): value is LoginNotice {
  return typeof value === 'string' && Object.hasOwn(LOGIN_NOTICES, value);
}

/**
 * Toasts de un login fallido, por status (RF-auth-20). En las pantallas de autenticación el texto lo
 * decide el frontend, nunca el mensaje de la API (`forms-conventions.md`).
 */
export const LOGIN_ERROR_MESSAGES = {
  invalidCredentials: 'Correo o contraseña incorrectos',
  tooManyAttempts: 'Demasiados intentos. Espera un momento y vuelve a probar',
  unavailable: 'No se pudo iniciar sesión. Intenta de nuevo en unos minutos',
} as const;
