#!/usr/bin/env node
/**
 * Hook `PostToolUse` (Edit|Write): formatea con Prettier el archivo recién editado.
 *
 * Claude Code entrega el evento como JSON por stdin; la ruta está en
 * `tool_input.file_path` (no existe una variable de entorno con ella). Es Node y
 * no `jq` porque `jq` no está instalado ni en WSL ni en Windows.
 *
 * Nunca bloquea: si Prettier no está instalado, el archivo no es soportado o
 * está en `.prettierignore`, termina en silencio con código 0.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function editedFile() {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const file = input.tool_input?.file_path;
  return typeof file === 'string' ? path.resolve(input.cwd ?? '.', file) : null;
}

try {
  const file = editedFile();
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const prettier = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');

  if (file && existsSync(file) && existsSync(prettier)) {
    spawnSync(process.execPath, [prettier, '--write', '--ignore-unknown', file], {
      cwd: root,
      stdio: 'ignore',
    });
  }
} catch {
  // Formatear es una comodidad: un fallo acá no debe interrumpir la edición.
}
