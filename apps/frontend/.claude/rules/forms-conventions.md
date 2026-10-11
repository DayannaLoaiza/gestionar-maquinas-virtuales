# Form Conventions — apps/frontend

> Formularios de referencia: el login (`src/features/auth/components/login-form.tsx`), que espera la
> respuesta, y el de VMs (`src/features/vms/components/vm-form.tsx`), optimista (ver "Formularios
> optimistas").

## Mandatory Stack

Every form MUST use:

- `react-hook-form` with `zodResolver` for state management and validation
- Zod schemas for validation rules and type inference

## Schema Location

- Schemas shared with backend → `packages/shared-types/src/dto/`
- Schemas only used in frontend → `src/schemas/` (p. ej. `vm-form.ts`), reutilizando las piezas del
  DTO (`CreateVirtualMachineDTO.shape.*`, `VmName`) para no duplicar reglas ni mensajes
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
   - **Excepción — pantallas de autenticación** (hoy, el login): **no** se muestra el mensaje del
     API; el texto se decide en el front por status (`loginErrorMessage`, con los textos de
     `LOGIN_ERROR_MESSAGES` en `src/config/auth.ts`), para no revelar si una cuenta existe.
   - Si el error del API se muestra por toast y el formulario se queda, llamar además a
     `setError('root.server', …)` sin pintarlo: si no, RHF da el envío por exitoso y
     `isSubmitSuccessful` deja el botón deshabilitado.
5. `isSubmitting` — disable the submit button and inputs during submission.
6. Data transformation — transform `FormData` to the API DTO before sending (strip
   `confirmPassword`, convert string ids, etc.).
7. Zod error messages in Spanish (`z.string().min(1, 'El nombre es requerido')`).
8. API submission — `post()`, `put()`, `patch()` or `del()` from `@/lib/api/fetch-wrapper`, never
   bare `fetch()` with manual error handling.
9. **Un solo canal de confirmación:** si el formulario **navega**, confirma con toast; si **se
   queda** en la pantalla, con un panel inline. Nunca los dos.
   - Tras el éxito: `notify.success()` + `router.replace()` (no `push`: el formulario ya se envió).
     **Nunca `window.location.href`**: una recarga completa desmonta el `<Toaster />`. Única
     excepción, a propósito: cerrar sesión y el `401` cargan `/login` con `goToLogin()`
     (`window.location.replace`), para descartar todo dato privado en memoria; el aviso lo muestra
     `/login` (spec `auth`, hallazgo F3).
   - Bloquear el doble submit con `disabled={isSubmitSuccessful}` (`isSubmitting` vuelve a `false`
     antes de que termine la navegación). No replicarlo con un `useState` propio.
   - **No agregar `router.refresh()`** después de `replace()`: refresca la ruta que se está dejando.
     Las páginas ya piden datos frescos (`serverFetch` sin Data Cache).

## Formularios optimistas

Cuando la pantalla muestra el resultado al instante y no espera la respuesta (hoy, crear y editar
una VM, spec `virtual-machines` RF-16…21), cambian algunas reglas de arriba:

- **Validación mientras se escribe:** `mode: 'all'` (al escribir y al salir del campo) en vez de
  `'onBlur'`. El botón de enviar se deshabilita con `!isValid`, y junto a él un texto dice qué
  falta (campos obligatorios vacíos o "Corrige los campos marcados"), asociado con
  `aria-describedby`.
- **Con transformaciones** (texto → número), `useForm<z.input<…>, unknown, z.output<…>>`: los tres
  genéricos se infieren del schema, nunca se escriben a mano.
- **Números como texto:** `<input type="text" inputMode="numeric">` y el schema convierte. Con
  `type="number"`, `2,5` llega como `""` y no se distingue de un campo vacío.
- **Al enviar no se espera:** el formulario dispara la mutación del hook de la feature y se cierra.
  No hay `isSubmitting` ni `isSubmitSuccessful`; el toast de éxito o de error lo da el hook cuando
  la API responde (sus callbacks van en `useMutation`, no en `mutate`, porque el formulario ya se
  desmontó).
- **Edición:** el cuerpo del `PUT` lleva solo los campos que cambiaron (`buildUpdatePayload`), para
  no pisar con valores viejos un cambio de otra persona.
- **Si la creación falla,** el formulario se reabre solo con lo escrito y, con `409`, el error en el
  campo (`setError` + `setFocus`), sin tapar otro modal abierto.
