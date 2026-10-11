'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { StandalonePage } from '@/components/layout/standalone-page';
import { AlertTriangle } from '@/components/svg/alert-triangle';
import { Button } from '@/components/ui/button';

/**
 * La API no respondió al verificar la sesión o al pedir los datos de una página (RF-auth-24): nunca
 * se muestra el contenido privado ni se manda al login, porque no es un problema de credenciales.
 * Está en la raíz porque una boundary no envuelve al layout de su propio segmento, y la falla puede
 * venir de `(panel)/layout.tsx`. `retry()` vuelve a pedir y renderizar el segmento (Next 16.3+).
 */
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <StandalonePage>
      <EmptyState
        icon={AlertTriangle}
        title="No pudimos cargar esta página"
        description="El servidor no respondió. Revisa tu conexión e intenta de nuevo en unos segundos."
        titleAs="h1"
        className="max-w-xl"
        action={
          <Button
            onClick={() => {
              retry();
            }}
          >
            Reintentar
          </Button>
        }
      />
    </StandalonePage>
  );
}
