'use client';

import { EmptyState } from '@/components/feedback/empty-state';
import { AlertCircle } from '@/components/svg/alert-circle';
import { Loader2 } from '@/components/svg/loader-2';
import { Refresh } from '@/components/svg/refresh';
import { Button } from '@/components/ui/button';
import { PANEL_TEXT } from '@/config/panel';

interface VmsErrorStateProps {
  onRetry: () => void;
  isRetrying: boolean;
}

/**
 * El listado no cargó (RF-virtual-machines-15): en lugar del listado y del panel de recursos, un
 * mensaje con "Reintentar", nunca un listado vacío como si no hubiera VMs. `role="alert"`: aparece
 * después de la carga y los lectores de pantalla lo anuncian.
 */
export function VmsErrorState({ onRetry, isRetrying }: Readonly<VmsErrorStateProps>) {
  return (
    <div role="alert">
      <EmptyState
        icon={AlertCircle}
        title={PANEL_TEXT.errorTitle}
        description={PANEL_TEXT.errorDescription}
        action={
          <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? <Loader2 className="animate-spin" /> : <Refresh />}
            {PANEL_TEXT.retry}
          </Button>
        }
      />
    </div>
  );
}
