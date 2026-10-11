/**
 * Regla de origen de `OriginGuard` (RF-auth-11) y del handshake del socket
 * (RF-realtime-vm-status-04). Un navegador siempre envía `Origin` en esas peticiones, y uno que no
 * está en `CORS_ORIGIN` se rechaza; la comparación es exacta (`http://a.test.evil.com` no pasa por
 * `http://a.test`). Sin `Origin` se permite: los clientes que no lo envían (Postman, `curl`) no
 * llevan la cookie de otra persona.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  return origin === undefined || allowedOrigins.has(origin);
}
