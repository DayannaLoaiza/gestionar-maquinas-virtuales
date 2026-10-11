import helmet from 'helmet';

/**
 * Cabeceras de seguridad de `helmet` (RF-auth-10). Las usan Express (`configureHttpApp`) y
 * Engine.IO (`RealtimeIoAdapter`), que atiende `/api/socket.io` antes que Express
 * (RF-realtime-vm-status-10). HSTS solo en producción: sobre http://localhost el navegador lo
 * ignora.
 */
export function createSecurityHeaders(isProduction: boolean): ReturnType<typeof helmet> {
  return helmet({ strictTransportSecurity: isProduction });
}
