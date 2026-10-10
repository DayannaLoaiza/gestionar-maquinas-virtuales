# Component Conventions — apps/frontend

> Convenciones adoptadas de Visor. **Aún no instalado:** Radix UI, shadcn, `class-variance-authority`,
> `tw-animate-css`, `sonner`, `react-hook-form`. Lo que depende de ellas aplica desde que se
> agreguen; mientras tanto no se escribe una alternativa propia que después haya que migrar.

## Pre-Implementation Audit (MANDATORY)

Before creating any new component, search for existing ones:

```
Glob: src/components/**/*.tsx
Glob: src/features/**/components/*.tsx
```

If a similar component exists, extend or compose it — do not duplicate.

## Directory Structure

- `src/components/ui/` — primitivos reutilizables y los wrappers de Radix (cuando se instale). Hoy:
  `data-table/` (tabla genérica de TanStack: orden, búsqueda global, paginación).
- `src/components/svg/` — íconos como componentes React (ver `icon-conventions.md`).
- `src/features/<feature>/` — lo propio de una feature: `components/` (columnas, vistas, badges
  locales). Todavía no hay features.
- `src/lib/` — utilidades (`utils.ts` con `cn`, `env.ts`) y `api/` (cliente HTTP, ver
  `nextjs-patterns.md`).
- `src/types/api.ts` — formas de respuesta de cada endpoint (se crea con el primero).

## SVG Icons

- ALWAYS import from `src/components/svg/` — never inline `<svg>` markup.
- See `icon-conventions.md`.

## Forms

- ALL forms MUST use `react-hook-form` with `zodResolver` and schemas from `@vm/shared-types`.
- See `forms-conventions.md`.

## Radix UI

- Use Radix primitives for accessible interactive components: Dialog, DropdownMenu, Popover,
  Tooltip, etc.
- Wrap them in local components under `src/components/ui/` for consistent styling; see
  `component-imports.md`.
- **`Select` nativo:** para listas cortas, envolver el `<select>` nativo con los tokens (entra con
  `{...register('campo')}` sin `Controller`, no carga JS y en móvil abre el selector del sistema).
  Para buscar o agrupar, un `Combobox` (`Popover` + `Command`).

## Variants with CVA

- `class-variance-authority` para componentes con **variantes reales** (size, tone, state); con
  uno o dos estados alcanza `cn()` con condicionales.
- Variant definitions co-located with the component file. El tipo de una variante se deriva con
  `VariantProps`, no se repite a mano.

## Animaciones

- Entrada/salida de overlays con las utilidades de `tw-animate-css` (`animate-in`, `fade-in-0`,
  `zoom-in-95`…), como en shadcn. No escribir keyframes propios para eso.
- Una regla global de `prefers-reduced-motion` en `globals.css` acorta animaciones (a 0.01ms, no
  `none`: Radix espera `animationend`) y exceptúa `animate-spin`. No agregar `motion-reduce:` por
  componente.

## Design System Tokens

- Tailwind 4, sin `tailwind.config`: la paleta y las fuentes están en `src/app/theme.css`
  (`@theme`); los tokens semánticos y los estilos base, en `src/app/globals.css`.
- Never hardcode hex colors or pixel spacing — use tokens or Tailwind classes.
- 8px grid: xs=8px, sm=16px, md=24px, lg=32px, xl=48px, 2xl=64px.
- **Foco:** contorno `ring` en `:focus-visible`, definido una vez en `globals.css` (`@layer base`);
  un componente con foco propio pone `outline-none` + su anillo.

### Paleta — solo existe lo que define `theme.css`

`theme.css` arranca con
`--color-*: initial`, que **borra la paleta de Tailwind**. Una clase de un color no definido
(`bg-zinc-50`, `text-red-600`, `bg-muted-500`) compila a **nada**, sin error ni warning.
`src/app/palette.test.ts` falla si aparece una, y también ante un color arbitrario (`bg-[#…]`,
`text-[rgb(…)]`), un `var(--color-x)` inexistente o un hex/`rgb()` literal en `.ts`/`.tsx`.

| Familia                         | Pasos                                        | Uso                                                                                     |
| ------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `primary` (azul)                | 50 · 100 · 200 … 900 · 950                   | Azul de marca (500 `#003cde`): CTAs, enlaces, foco. Blanco sobre 500: 7.77:1            |
| `secondary` (cian)              | 50 · 100 · 200 · 400 · 500 · 600 · 700 · 800 | Acento (500 `#00e0ff`): gráficos, resaltado del tiempo real. Texto sobre él: `navy-900` |
| `navy` (azul marino)            | 50 · 100 · 200 … 900 · 950                   | Superficies del modo oscuro (900 `#11153d`), titulares en claro                         |
| `surface` (grises)              | 50 · 100 · 200 … 900 · 950                   | Fondos, bordes y texto secundario en modo claro                                         |
| `white` · `black`               | —                                            | `#ffffff` · `#000000`                                                                   |
| `success` · `warning` · `error` | 50 · 100 · 200 · 500 · 600 · 700 · 800       | Estados. Alerta: fondo 50, borde 200, ícono 600, texto 700/800                          |

**Tokens semánticos** (`globals.css`): cambian solos entre modo claro y oscuro. Úsalos para todo lo
que es superficie o texto genérico, en vez de escalas + `dark:`.

| Token                                  | Claro                         | Oscuro (azul marino)    |
| -------------------------------------- | ----------------------------- | ----------------------- |
| `background` · `foreground`            | `white` · `navy-900`          | `navy-950` · `white`    |
| `card` · `card-foreground`             | `white` · `navy-900`          | `navy-900` · `white`    |
| `muted` · `muted-foreground`           | `surface-100` · `surface-500` | `navy-800` · `navy-200` |
| `border`                               | `surface-300`                 | `navy-800`              |
| `ring`                                 | `primary-500`                 | `primary-400`           |
| `link` (texto de enlace)               | `primary-600`                 | `primary-300`           |
| `primary-foreground` (texto sobre CTA) | `white`                       | `white`                 |

- **CTA:** `bg-primary-500 text-primary-foreground hover:bg-primary-600` (en oscuro, `dark:bg-primary-400`
  si hace falta más brillo: blanco sobre 400 da 4.82:1).
- **Contraste de texto chico ≥ 4.5:1:**
  - el **cian nunca es texto sobre fondo claro** (500 sobre blanco: 1.6:1); como texto, 700/800;
  - estados sobre blanco o sobre su 50: **700/800** (500 no llega). Sobre `navy-950`, 500 sí;
  - en oscuro, `primary-400` como texto sobre `navy-950` da 4.06:1: para enlaces, `text-link`.
- **Tonos de `StatusBadge`:** `success`, `warning`, `error`; `info` usa `primary`; `neutral` usa
  `muted`/`muted-foreground`.
- **Gradiente de marca:** `bg-linear-to-r from-primary-500 to-secondary-500`. Sin otros colores.
- **Gráficos y estilos inline:** colores como `var(--color-primary-500)`, nunca hex en TS.
- **Overlays:** `bg-black/50`. La opacidad va con `/NN`: `bg-opacity-*` es de Tailwind v3.
- **No usar tokens de shadcn** sin definir (`bg-primary`, `bg-secondary`, `bg-accent`, `bg-popover`,
  `bg-input`, `bg-destructive`): al copiar un componente de shadcn, traducirlos a esta tabla. La
  guarda los marca.
- **Agregar un color** es una decisión de diseño: `theme.css` + esta tabla.

## Performance

- Wrap client components that use `useSearchParams()` in a `<Suspense>` boundary.
- `React.memo`, `useCallback` y `useMemo` solo cuando el profiling muestra un beneficio medible.

## Accessibility

- All interactive elements must be keyboard-navigable.
- ARIA labels on icon-only buttons.
- Radix primitives handle most a11y — do not override their ARIA attributes.
- Para un árbol de navegación, el patrón WAI-ARIA APG "Navigation Treeview" (nodos planos,
  roving tabindex, teclas resueltas en una función pura). Para patrones ARIA, la skill
  `accessibility-compliance`.
