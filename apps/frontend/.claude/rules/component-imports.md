# Component Import Rules — apps/frontend

> **Aún no instalado:** Radix UI, `cmdk`, `sonner`. Estas reglas fijan cómo se importan desde el
> primer día en que se agreguen.

## NEVER import directly from these sources

- `@radix-ui/*` — use the equivalent component from `src/components/ui/`
- `cmdk` — use `src/components/ui/command.tsx`
- `sonner` — use `notify` from `src/components/ui/toast.ts` (and `Toaster` from
  `src/components/ui/sonner.tsx`, montado una sola vez en `app/layout.tsx`)

If you need something these libraries provide that no `components/ui/` wrapper covers, **create the
wrapper first** in `components/ui/`, then import from there.

## Import priority order

1. Does a project wrapper exist in `src/components/`? → Import from there
2. Does a base component exist in `src/components/ui/`? → Import from there
3. Neither exists? → Install with `npx shadcn add [component]` (desde Windows) or create a wrapper
   in `components/ui/`, then import from `components/ui/`
4. shadcn doesn't have it? → Discuss before adding a new primitive library

> Ojo con shadcn: algunas variantes publicadas como "Radix" importan otra librería (el Combobox
> usa `@base-ui/react`). Revisar qué dependencias trae antes de aceptar un `shadcn add`.

## Atomic vs compound

- **Atómicos** (hojas, se importan directo de `components/ui/`): `Button`, `Input`, `Textarea`,
  `Select` (nativo), `Separator`, `Skeleton`, `Avatar`, `Tooltip`.
- **Compuestos** (wrappers de Radix con el tema del proyecto): `Dialog`, `DropdownMenu`, `Sheet`,
  `Popover`, `Command`, `Combobox`.
- **Estados:** un único `StatusBadge` global por tono (`success`, `warning`, `error`, `info`,
  `neutral`) en `ui/status-badge.tsx` con CVA; cada feature mapea sus estados a tonos en un solo
  archivo. Un badge que solo usa una feature puede vivir en ella hasta que aparezca un segundo
  consumidor.

Import the named exports — never the Radix primitives:

```tsx
// ✅ Correct
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ❌ Wrong
import * as Dialog from '@radix-ui/react-dialog';
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
notify.apiError(error, 'No se pudo crear la máquina virtual'); // aplica toUserMessage()

// ❌ Wrong
import { toast } from 'sonner';
```

`notify.error()` y `notify.apiError()` fijan la duración larga de los errores: no pasar `duration`
a mano en los call sites.

## Where Radix imports ARE allowed

Only inside `src/components/ui/*.tsx` wrapper files. These files are the **only** boundary between
Radix primitives and the rest of the app.
