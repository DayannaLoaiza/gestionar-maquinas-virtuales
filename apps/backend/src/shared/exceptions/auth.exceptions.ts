import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Excepciones de `auth`. Sus mensajes son para el usuario: el frontend muestra un 4xx tal cual
 * (`docs/specs/auth/spec.md` → "Contratos visibles").
 */

/** Login fallido. El mismo para email inexistente, contraseña incorrecta o usuario inactivo. */
export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({ message: 'Correo o contraseña incorrectos', code: 'INVALID_CREDENTIALS' });
  }
}

/**
 * Cuerpo del error de sesión. Lo comparten el `401` y el rechazo del handshake del socket
 * (RF-realtime-vm-status-03).
 */
export const UNAUTHENTICATED_ERROR = {
  message: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo',
  code: 'UNAUTHENTICATED',
} as const;

/** Sin sesión válida: falta la cookie, el token no verifica o la sesión venció o se revocó. */
export class UnauthenticatedException extends UnauthorizedException {
  constructor() {
    super({ ...UNAUTHENTICATED_ERROR });
  }
}

/** Rol sin permiso para la ruta, u origen no permitido en una petición que cambia estado. */
export class AccessDeniedException extends ForbiddenException {
  constructor() {
    super({ message: 'No tienes permisos para realizar esta acción', code: 'FORBIDDEN' });
  }
}

/** Demasiados intentos de login en la ventana del rate limit. */
export class TooManyAttemptsException extends HttpException {
  constructor() {
    super(
      {
        message: 'Demasiados intentos. Espera un momento y vuelve a probar',
        code: 'TOO_MANY_REQUESTS',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
