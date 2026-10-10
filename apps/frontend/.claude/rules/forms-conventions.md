# Form Conventions — apps/frontend

> **Aún no instalado:** `react-hook-form`, `@hookform/resolvers`, `sonner`. Hoy no hay formularios;
> el primero que se escriba sigue este patrón.

## Mandatory Stack

Every form MUST use:

- `react-hook-form` with `zodResolver` for state management and validation
- Zod schemas for validation rules and type inference

## Schema Location

- Schemas shared with backend → `packages/shared-types/src/dto/`
- Schemas only used in frontend → `src/schemas/` (create directory if needed)
- NEVER define Zod schemas inline in component files

## Type Inference

- ALWAYS infer form types from the schema: `type FormData = z.infer<typeof schema>`
- NEVER define form types manually alongside a schema

## Standard Pattern

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// `CreateThingDTO` representa el schema de la capacidad, en packages/shared-types/src/dto/.
import { CreateThingDTO } from '@vm/shared-types';

import { post } from '@/lib/api/fetch-wrapper';
import { toUserMessage } from '@/lib/api/api-error';

export function CreateThingForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<CreateThingDTO>({
    resolver: zodResolver(CreateThingDTO),
    defaultValues: { name: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (data: CreateThingDTO) => {
    try {
      await post('/api/things', data);
    } catch (error: unknown) {
      setError('root', { message: toUserMessage(error, 'No se pudo guardar') });
    }
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* … */}</form>;
}
```

## Rules

1. `defaultValues` — ALWAYS explicit. Never leave fields undefined.
2. `mode` — `'onBlur'` for most forms (validates on blur, not on every keystroke).
3. `Controller` — for complex inputs (custom selects, date pickers, checkboxes). Never `useState` +
   `onChange` for fields that react-hook-form can manage.
4. **Error display.** Field-level errors from `errors.fieldName?.message`. Los errores del API van
   por toast o `setError('root')`, y se muestra **solo** el mensaje del backend: nunca la
   estructura de la respuesta, el status, la URL ni el JSON crudo. En el `catch`,
   `toUserMessage(error, '<fallback de la pantalla>')` de `@/lib/api/api-error`.
   - ⚠️ **El fallback no es decorativo: es el texto que se ve** cuando el status es 5xx o 429, o el
     `code` es `VALIDATION_ERROR` / `INTERNAL_ERROR`, y ante cualquier fallo que no sea un
     `ApiError` (red, HTML del proxy, un bug dentro del `try`). Escribirlo como copy final.
   - **Excepción — pantallas de autenticación** (cuando existan): en login y recuperación de
     contraseña **no** se muestra el mensaje del API; el texto se decide en el front por status,
     para no revelar si una cuenta existe.
5. `isSubmitting` — disable the submit button and inputs during submission.
6. Data transformation — transform `FormData` to the API DTO before sending (strip
   `confirmPassword`, convert string ids, etc.).
7. Zod error messages in Spanish (`z.string().min(1, 'El nombre es requerido')`).
8. API submission — `post()`, `put()`, `patch()` or `del()` from `@/lib/api/fetch-wrapper`, never
   bare `fetch()` with manual error handling.
9. **Un solo canal de confirmación:** si el formulario **navega**, confirma con toast; si **se
   queda** en la pantalla, con un panel inline. Nunca los dos.
   - Tras el éxito: `notify.success()` + `router.replace()` (no `push`: el formulario ya se envió).
     **Nunca `window.location.href`**: una recarga completa desmonta el `<Toaster />`.
   - Bloquear el doble submit con `disabled={isSubmitSuccessful}` (`isSubmitting` vuelve a `false`
     antes de que termine la navegación). No replicarlo con un `useState` propio.
   - **No agregar `router.refresh()`** después de `replace()`: refresca la ruta que se está dejando.
     Las páginas ya piden datos frescos (`serverFetch` sin Data Cache).
