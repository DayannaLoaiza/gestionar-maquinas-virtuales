/**
 * Guarda estructural de RF-auth-25 (`docs/testing.md`, K5). El layout del panel no se vuelve a
 * renderizar al navegar, así que cada página tiene que verificar la sesión por su cuenta: una página
 * nueva que lo olvide mostraría su contenido sin sesión verificada, y nada avisaría.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const PANEL_DIR = __dirname;
const ROUTE_FILES = new Set(['page.tsx', 'layout.tsx']);
/**
 * La primera instrucción del componente exportado (`nextjs-patterns.md`): no alcanza con que la
 * llamada aparezca en algún lugar del archivo (un comentario, después de renderizar, bajo un `if`).
 */
const SESSION_CHECK_FIRST =
  /export default async function \w+\([^)]*\)[^{]*\{\s*(?:const \w+ = )?await require(?:User|Admin)\(\);/;

function panelRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return panelRouteFiles(fullPath);
    return ROUTE_FILES.has(entry.name) ? [fullPath] : [];
  });
}

describe('rutas del panel (RF-auth-25)', () => {
  const files = panelRouteFiles(PANEL_DIR).map((file) => path.relative(PANEL_DIR, file));

  it('RF-auth-25 hay al menos el layout y la página del Panel', () => {
    expect(files).toEqual(expect.arrayContaining(['layout.tsx', 'page.tsx']));
  });

  it.each(files)(
    'RF-auth-25 %s empieza verificando la sesión con requireUser() o requireAdmin()',
    (file) => {
      const source = readFileSync(path.join(PANEL_DIR, file), 'utf8');

      expect(source).toMatch(SESSION_CHECK_FIRST);
    },
  );
});
