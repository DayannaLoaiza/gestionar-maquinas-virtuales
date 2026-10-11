import { describe, expect, it } from 'vitest';

import { PAGE_HEADERS_SOURCE, buildSecurityHeaders } from './security-headers';
import nextConfig from '../../next.config';

const PAGE_HEADERS = {
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function asRecord(headers: { key: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
}

/** `source` de `headers()` es un patrón de path-to-regexp; sus grupos son regex de JS. */
function matchesSource(source: string, pathname: string): boolean {
  return new RegExp(`^${source}$`).test(pathname);
}

describe('cabeceras de seguridad de las páginas (RF-auth-34)', () => {
  it('next.config aplica las cuatro cabeceras a las páginas, sin X-Powered-By ni HSTS fuera de producción', async () => {
    const rules = await nextConfig.headers?.();

    expect(nextConfig.poweredByHeader).toBe(false);
    expect(rules?.map((rule) => rule.source)).toEqual([PAGE_HEADERS_SOURCE]);
    expect(asRecord(rules?.[0]?.headers ?? [])).toEqual(PAGE_HEADERS);
  });

  it('las aplica a /login, al Panel y a una ruta inexistente, y no a /api/*', () => {
    expect(matchesSource(PAGE_HEADERS_SOURCE, '/login')).toBe(true);
    expect(matchesSource(PAGE_HEADERS_SOURCE, '/')).toBe(true);
    expect(matchesSource(PAGE_HEADERS_SOURCE, '/no-existe')).toBe(true);
    expect(matchesSource(PAGE_HEADERS_SOURCE, '/api/auth/me')).toBe(false);
  });

  it('agrega HSTS solo en producción', () => {
    expect(asRecord(buildSecurityHeaders({ isProduction: true }))).toEqual({
      ...PAGE_HEADERS,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });
  });
});
