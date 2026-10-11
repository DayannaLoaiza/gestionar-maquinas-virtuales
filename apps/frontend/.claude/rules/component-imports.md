# Component Import Rules — apps/frontend

> **Aún no instalado:** `cmdk`. Esta regla fija cómo se importa desde el primer día en que se
> agregue.

## NEVER import directly from these sources

- `radix-ui` (el paquete unificado que usa el proyecto) y `@radix-ui/*` — use the equivalent
  component from `src/components/ui/`
- `cmdk` — use `src/components/ui/command.tsx`
- `sonner` — use `notify` from `src/components/ui/toast.ts` (and `Toaster` from
  `src/components/ui/sonner.tsx`, montado una sola vez en `app/layout.tsx`)

If you need something these libraries provide that no `components/ui/` wrapper covers, **create the
wrapper first** in `components/ui/`, then import from there.

## Import priority order

1. Does a project wrapper exist in `src/components/`? → Import from there
2. Does a base component exist in `src/components/ui/`? → Import from there
3. Neither exists? → Copiar el componente del registro de shadcn (`new-york-v4`,
   `https://ui.shadcn.com/r/styles/new-york-v4/<nombre>.json`) a `components/ui/` y adaptarlo:
   tokens del proyecto (`component-conventions.md`, equivalencias de shadcn) e íconos de
   `components/svg/`. **No correr `npx shadcn add`:** instala `lucide-react` (prohibido por
   `icon-conventions.md`) y escribe tokens `oklch` en `globals.css`, que la paleta cerrada no
   admite.
4. shadcn doesn't have it? → Discuss before adding a new primitive library

> Ojo con shadcn: algunas variantes publicadas como "Radix" importan otra librería (el Combobox
> usa `@base-ui/react`). Revisar las dependencias del JSON del registro antes de copiarlo.

## Atomic vs compound

Existentes hoy: `Button`, `Input`, `Label`, `NativeSelect`, `Switch`, `Skeleton`, `Empty*`,
`StatusBadge`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Sheet`, `Toaster` + `notify`. El resto de
la lista se crea con su primer uso.

- **Atómicos** (hojas, se importan directo de `components/ui/`): `Button`, `Input`, `Textarea`,
  `NativeSelect`, `Switch`, `Separator`, `Skeleton`, `Avatar`, `Tooltip`.
- **Compuestos** (wrappers de Radix con el tema del proyecto): `Dialog`, `AlertDialog`,
  `DropdownMenu`, `Sheet`, `Popover`, `Command`, `Combobox`.
- **Feedback listo para usar** (`components/feedback/`, no en `ui/`): `EmptyState` (listado sin
  registros), `CardGridSkeleton`, `TableSkeleton`, `ChartSkeleton`. Para carga y vacío, usar estos
  en vez de armar bloques de `Skeleton` o `Empty*` en cada pantalla.
- **Estados:** un único `StatusBadge` global por tono (`success`, `warning`, `error`, `info`,
  `neutral`) en `ui/status-badge.tsx` con CVA; cada feature mapea sus estados a tonos en un solo
  archivo (p. ej. `features/vms/components/vm-status-badge.tsx`). Un badge que solo usa una
  feature puede vivir en ella hasta que aparezca un segundo consumidor.

Import the named exports — never the Radix primitives:

```tsx
// ✅ Correct
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// ❌ Wrong
import { Dialog } from 'radix-ui';
```

## Toasts

`sonner` se usa a través de dos archivos y de ninguna otra forma:

| Qué                                      | Dónde                                                 |
| ---------------------------------------- | ----------------------------------------------------- |
| `<Toaster />` (defaults, iconos, tokens) | `components/ui/sonner.tsx` — sólo en `app/layout.tsx` |
| API imperativa (`notify.*`)              | `components/ui/toast.ts`                              |

```tsx
// ✅ Correct
import { notify } from '@/components/ui/toast';

notify.success('Máquina virtual creada');
notify.warning('La VM sigue encendida', { description: 'Apágala antes de cambiar su disco.' });
notify.apiError(error, 'No se pudo crear la máquina virtual'); // aplica toUserMessage()

// ❌ Wrong
import { toast } from 'sonner';
```

`notify.error()` y `notify.apiError()` fijan la duración larga de los errores (8 s; éxito y
advertencia, 4 s): `notify` no acepta `duration`.

## Controles según el rol

Un control que solo puede usar el Administrador (crear, editar, eliminar) no existe en el DOM para
un Cliente o un rol desconocido (RF-auth-30). Nunca se oculta con CSS, `hidden` ni `disabled` según
el rol.

- **En un Client Component:** dentro de `AdminOnly` (`@/components/auth/admin-only`).
- **En un Server Component:** `isAdmin(await requireUser()) && <Control />`. **No** `AdminOnly`:
  sus `children` viajarían en el payload RSC del Cliente aunque no se rendericen.
- **Página solo de Administrador:** empieza con `await requireAdmin()`.

```tsx
// ✅ Correct
<AdminOnly>
  <Button>Crear máquina virtual</Button>
</AdminOnly>

// ❌ Wrong
<Button className={isAdmin ? '' : 'hidden'}>Crear máquina virtual</Button>
```

## Where Radix imports ARE allowed

Only inside `src/components/ui/*.tsx` wrapper files. These files are the **only** boundary between
Radix primitives and the rest of the app.
