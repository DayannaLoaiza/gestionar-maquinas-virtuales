/** `id` del contenido principal, destino del enlace "Saltar al contenido". */
export const MAIN_CONTENT_ID = 'contenido';

/**
 * Primer elemento enfocable del shell (RF-app-shell-13): oculto hasta recibir el foco, lleva al
 * contenido principal sin recorrer la navegación.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md"
    >
      Saltar al contenido
    </a>
  );
}
