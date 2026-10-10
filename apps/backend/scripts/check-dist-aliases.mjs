// Falla el build si algún import `@/…` llegó sin reescribir a dist/.
//
// `nest build` reescribe el alias de tsconfig a rutas relativas, pero lo resuelve contra el
// directorio actual: corrido desde otro lugar que no sea apps/backend, deja `require("@/…")` en la
// salida sin error de compilación, y el API recién falla al arrancar. Esta guarda lo convierte en
// un error de build.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST_PATH = fileURLToPath(new URL('../dist/', import.meta.url));
const UNRESOLVED_ALIAS = /require\(["']@\//;

function listJsFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return listJsFiles(fullPath);
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

const offenders = listJsFiles(DIST_PATH).filter((file) =>
  UNRESOLVED_ALIAS.test(readFileSync(file, 'utf8')),
);

if (offenders.length > 0) {
  console.error('Imports @/ sin reescribir en dist/ (¿nest build corrió fuera de apps/backend?):');
  for (const file of offenders) console.error(`  ${relative(DIST_PATH, file)}`);
  process.exit(1);
}
