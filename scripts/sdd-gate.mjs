#!/usr/bin/env node
/**
 * Freno de la puerta G2 del flujo SDD (C3), para el hook `PreToolUse` de la
 * skill `sdd` (`.claude/skills/sdd/SKILL.md`). Lee del stdin el evento del
 * hook. Si la herramienta va a escribir en `apps/` o `packages/` y no hay
 * ningún `tasks.md` aprobado en `docs/specs/<slug>/changes/`, o si va a
 * escribir `docs/constitution.md`, responde `ask`: Claude Code pide
 * confirmación y muestra el motivo. En cualquier otro caso no responde nada y
 * la edición sigue el flujo normal de permisos.
 *
 * Falla cerrado: un error propio también responde `ask`, porque un hook que
 * termina con un error (código distinto de 2) deja pasar la edición (doc de
 * hooks de Claude Code). Corre en Node 20, sin dependencias. Proceso:
 * `docs/sdd/README.md`; lo propio de Claude: `.claude/rules/claude-code.md`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const CONSTITUTION = 'docs/constitution.md';
const CODE_DIRS = ['apps/', 'packages/'];
const APPROVED = 'aprobada';

/** El archivo que la herramienta va a escribir (`Edit`, `Write` o `NotebookEdit`). */
function targetFile(input) {
  const toolInput = input.tool_input ?? {};
  const file = toolInput.file_path ?? toolInput.notebook_path;
  return typeof file === 'string' ? path.resolve(input.cwd ?? '.', file) : null;
}

/** La raíz del repo del archivo: la primera carpeta con `docs/constitution.md` (sirve también en un worktree). */
function repoRoot(file) {
  let dir = path.dirname(file);
  while (!existsSync(path.join(dir, CONSTITUTION))) {
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return dir;
}

function subdirectories(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name));
}

/** Todos los `docs/specs/<slug>/changes/<cambio>/tasks.md` que existen. */
function tasksFiles(root) {
  return subdirectories(path.join(root, 'docs', 'specs'))
    .flatMap((spec) => subdirectories(path.join(spec, 'changes')))
    .map((change) => path.join(change, 'tasks.md'))
    .filter((file) => existsSync(file));
}

/** El valor de la fila `| Estado | … |` de la cabecera de un `tasks.md`. */
function stateOf(tasksFile) {
  const content = readFileSync(tasksFile, 'utf8');
  const match = content.match(/^\|\s*Estado\s*\|\s*([^|]+?)\s*\|/m);
  return match ? match[1] : null;
}

function hasApprovedTasks(root) {
  return tasksFiles(root).some((file) => stateOf(file) === APPROVED);
}

/** El motivo para pedir confirmación, o `null` si la edición no toca la puerta. */
function reasonToAsk(input) {
  const file = targetFile(input);
  const root = file ? repoRoot(file) : null;
  if (!root) return null;
  const relative = path.relative(root, file).split(path.sep).join('/');
  if (relative === CONSTITUTION) {
    return 'Editar docs/constitution.md es una enmienda: necesita la puerta G0 (sección "Enmiendas").';
  }
  if (!CODE_DIRS.some((dir) => relative.startsWith(dir))) return null;
  if (hasApprovedTasks(root)) return null;
  return (
    `SDD (C3): ${relative} está en apps/ o packages/ y no hay ningún tasks.md aprobado ` +
    'en docs/specs/<slug>/changes/. Si es un cambio S (no cambia comportamiento observable), ' +
    'confírmalo; si es M o L, falta la puerta G2.'
  );
}

function ask(reason) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

try {
  const reason = reasonToAsk(JSON.parse(readFileSync(0, 'utf8')));
  if (reason) ask(reason);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  ask(`No se pudo verificar la puerta SDD (${detail}). Confirma solo si el cambio está aprobado.`);
}
