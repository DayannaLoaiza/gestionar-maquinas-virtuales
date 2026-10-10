/**
 * @vitest-environment node
 *
 * Guarda de la paleta. `theme.css` empieza con `--color-*: initial`, así que la paleta de
 * Tailwind no existe: una clase como `bg-zinc-50`, `text-red-600` o `bg-muted-500` compila a nada,
 * sin error ni warning. Este test falla si `src` usa un color que `theme.css`/`globals.css` no
 * definen, un color arbitrario (`bg-[#…]`) o un color literal en TS (`'#003cde'`, `rgb(…)`): los
 * colores salen solo de la paleta.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(__dirname, '..');
const CSS_FILES = ['theme.css', 'globals.css'].map((file) => path.join(__dirname, file));

// Utilidades cuyo valor es un color. Primero los prefijos largos, para que `ring-offset-x` no se
// lea como `ring-`.
const COLOR_PREFIXES = [
  'ring-offset',
  'border-[xytrblse]',
  'bg',
  'text',
  'border',
  'ring',
  'outline',
  'divide',
  'fill',
  'stroke',
  'placeholder',
  'decoration',
  'caret',
  'accent',
  'from',
  'via',
  'to',
  'shadow',
];
const PREFIX_GROUP = `(?:${COLOR_PREFIXES.join('|')})`;
const CLASS_PATTERN = new RegExp(`^${PREFIX_GROUP}-(.+)$`);
const ARBITRARY_COLOR = new RegExp(`^${PREFIX_GROUP}-\\[(?:#|rgba?|hsla?|oklch|oklab|color:)`);

// Un valor es un color si es un paso de escala (`primary-500`) o uno de estos nombres: los
// semánticos del proyecto y los de shadcn, que aquí no existen salvo que los defina globals.css.
const SCALE_STEP = /^[a-z]+(?:-[a-z]+)*-\d{2,3}$/;
const NAMED_COLORS = new Set([
  'white',
  'black',
  'background',
  'foreground',
  'card',
  'muted',
  'border',
  'ring',
  'link',
  'accent',
  'input',
  'popover',
  'primary',
  'secondary',
  'destructive',
  'sidebar',
]);

// Utilidades de opacidad de Tailwind v3, eliminadas en v4: se usa el modificador `/75`.
const V3_OPACITY = /^(?:bg|text|border|ring|divide|placeholder)-opacity-\d+$/;

// Colores literales en código TS: un string que es solo un hex, o una función de color CSS.
const HEX_LITERAL = /(['"`])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\1/i;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab)\(/;

interface Finding {
  location: string;
  token: string;
}

function definedColors(): Set<string> {
  const colors = new Set<string>();
  for (const file of CSS_FILES) {
    for (const match of readFileSync(file, 'utf8').matchAll(/--color-([a-z0-9-]+)\s*:/g)) {
      if (match[1]) colors.add(match[1]);
    }
  }
  return colors;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    const isSource = /\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\./.test(entry);
    return isSource ? [fullPath] : [];
  });
}

/** Quita las variantes (`hover:`, `data-[state=open]:`), el `!` y el modificador de opacidad `/NN`. */
function baseUtility(token: string): string {
  const withoutVariants = token.split(/:(?![^[]*\])/).pop() ?? token;
  return withoutVariants.replace(/^!/, '').replace(/\/\d+$/, '');
}

function isColorValue(value: string): boolean {
  return SCALE_STEP.test(value) || NAMED_COLORS.has(value) || value.endsWith('-foreground');
}

function isUndefinedColorClass(utility: string, colors: Set<string>): boolean {
  if (V3_OPACITY.test(utility) || ARBITRARY_COLOR.test(utility)) return true;
  const value = CLASS_PATTERN.exec(utility)?.[1];
  return value !== undefined && isColorValue(value) && !colors.has(value);
}

function lineFindings(line: string, colors: Set<string>): string[] {
  const tokens = line
    .split(/[\s'"`{}()]+/)
    .filter((token) => isUndefinedColorClass(baseUtility(token), colors));
  const variables = [...line.matchAll(/var\(--color-([a-z0-9-]+)\)/g)]
    .filter((match) => match[1] !== undefined && !colors.has(match[1]))
    .map((match) => match[0]);
  const literals = [HEX_LITERAL, COLOR_FUNCTION].flatMap((pattern) => {
    const match = pattern.exec(line);
    return match ? [match[0]] : [];
  });
  return [...tokens, ...variables, ...literals];
}

function findUndefinedColors(): Finding[] {
  const colors = definedColors();
  return sourceFiles(SRC_DIR).flatMap((file) => {
    const relativePath = path.relative(SRC_DIR, file).split(path.sep).join('/');
    return readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        lineFindings(line, colors).map((token) => ({
          location: `${relativePath}:${index + 1}`,
          token,
        })),
      );
  });
}

describe('paleta del design system', () => {
  it('define cada color que usa src, sin colores arbitrarios ni literales', () => {
    const report = findUndefinedColors().map(({ location, token }) => `${location}  ${token}`);

    expect(report).toEqual([]);
  });
});
