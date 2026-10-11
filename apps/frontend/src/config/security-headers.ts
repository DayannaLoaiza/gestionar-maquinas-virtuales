export interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * Rutas que reciben las cabeceras: todas las páginas, no `/api/*`. Las respuestas de la API llegan
 * por el rewrite con las cabeceras de `helmet` (RF-auth-10), y repetirlas las duplicaría.
 */
export const PAGE_HEADERS_SOURCE = '/((?!api/).*)';

/** El mismo valor que manda `helmet` en la API. */
const HSTS_VALUE = 'max-age=31536000; includeSubDomains';

/**
 * Cabeceras de seguridad de toda página del frontend (RF-auth-34). Ningún sitio puede enmarcar el
 * login (`frame-ancestors` y `X-Frame-Options`, OWASP Clickjacking Defense). La CSP de scripts
 * queda fuera de alcance (decisión F1 de la spec). HSTS solo en producción: en desarrollo, el
 * navegador fijaría HTTPS para `localhost`.
 */
export function buildSecurityHeaders({
  isProduction,
}: {
  isProduction: boolean;
}): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ];
  if (!isProduction) return headers;
  return [...headers, { key: 'Strict-Transport-Security', value: HSTS_VALUE }];
}
