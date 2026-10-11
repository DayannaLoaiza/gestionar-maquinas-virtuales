import Link from 'next/link';

import { EmptyState } from '@/components/feedback/empty-state';
import { StandalonePage } from '@/components/layout/standalone-page';
import { RouteOff } from '@/components/svg/route-off';
import { Button } from '@/components/ui/button';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada',
};

/** Toda ruta inexistente: `404`, fuera del shell, con un camino de vuelta al Panel (RF-app-shell-12). */
export default function NotFound() {
  return (
    <StandalonePage>
      <EmptyState
        icon={RouteOff}
        title="Esta página no existe"
        description="Revisa la dirección o vuelve al panel."
        titleAs="h1"
        className="max-w-xl"
        action={
          <Button asChild>
            <Link href="/">Ir al panel</Link>
          </Button>
        }
      />
    </StandalonePage>
  );
}
