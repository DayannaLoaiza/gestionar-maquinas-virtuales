import { toast } from 'sonner';

import { ApiError, toUserMessage } from '@/lib/api/api-error';

/** Éxito y advertencia desaparecen a los 4 s (RF-app-shell-09). */
export const DEFAULT_TOAST_DURATION_MS = 4000;

/** Un error se queda el doble: hay que alcanzar a leer qué falló y qué hacer. */
const ERROR_TOAST_DURATION_MS = 8000;

/** `code` de la API para una sesión inválida o expirada (spec `auth`, "Contratos visibles"). */
const UNAUTHENTICATED_CODE = 'UNAUTHENTICATED';

export interface NotifyOptions {
  /** Segunda línea, más chica: qué hacer a continuación o el detalle del cambio. */
  description?: string;
}

/**
 * Única forma de lanzar un toast (`component-imports.md`). El contenedor es `Toaster`
 * (`./sonner.tsx`), montado en el layout raíz.
 *
 * @example
 * notify.success('Máquina virtual creada');
 * notify.apiError(error, 'No se pudo crear la máquina virtual');
 */
export const notify = {
  success(message: string, options: NotifyOptions = {}): void {
    toast.success(message, options);
  },
  warning(message: string, options: NotifyOptions = {}): void {
    toast.warning(message, options);
  },
  error(message: string, options: NotifyOptions = {}): void {
    toast.error(message, { ...options, duration: ERROR_TOAST_DURATION_MS });
  },
  /**
   * Error atrapado de una llamada a la API. Muestra `toUserMessage(error, fallback)`: el mensaje
   * del backend solo si está escrito para el usuario; si no, el fallback de la pantalla. Una sesión
   * expirada no muestra nada: `fetch-wrapper` ya está llevando a `/login`, que muestra el aviso, y
   * el toast desaparecería con la recarga (RF-auth-26).
   */
  apiError(error: unknown, fallback: string, options: NotifyOptions = {}): void {
    if (error instanceof ApiError && error.code === UNAUTHENTICATED_CODE) return;
    notify.error(toUserMessage(error, fallback), options);
  },
};
