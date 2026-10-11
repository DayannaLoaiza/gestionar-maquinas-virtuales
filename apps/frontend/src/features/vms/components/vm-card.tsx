'use client';

import { useId } from 'react';

import { AdminOnly } from '@/components/auth/admin-only';
import { useVmHighlight } from '@/components/realtime/realtime-context';
import { Loader2 } from '@/components/svg/loader-2';
import { PANEL_TEXT } from '@/config/panel';
import { formatGb, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';

import { VmCardActions } from './vm-card-actions';
import { VmStatusBadge } from './vm-status-badge';

import type { VisibleVm } from '@/lib/vms/pending-changes';

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * La tarjeta de una VM (RF-virtual-machines-13): nombre, sistema operativo, estado, cores, RAM y
 * disco. Los controles de escritura existen solo para el Administrador (RF-virtual-machines-14).
 * Con un cambio pendiente, se atenúa y dice "Guardando…" sin mover el foco (RF-virtual-machines-27).
 * Cuando un evento de tiempo real cambia su estado, un destello cian se desvanece en 2 s, sin mover
 * el contenido (RF-realtime-vm-status-13); cada evento nuevo lo reinicia (`key`).
 */
export function VmCard({ vm }: Readonly<{ vm: VisibleVm }>) {
  const titleId = useId();
  const isPending = vm.pending !== null;
  const highlight = useVmHighlight(vm.id);

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'relative flex flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground transition-opacity duration-200',
        isPending && 'opacity-70',
      )}
    >
      {highlight !== undefined && (
        <span
          key={highlight}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-vm-flash rounded-lg bg-highlight/15 opacity-0 ring-2 ring-highlight"
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={titleId} className="truncate font-semibold" title={vm.name}>
            {vm.name}
          </h3>
          <p className="truncate text-sm text-muted-foreground">{vm.os}</p>
        </div>
        <VmStatusBadge status={vm.status} />
      </div>
      <dl className="grid grid-cols-3 gap-4 border-t border-border pt-4">
        <Metric label="Cores" value={formatInteger(vm.cores)} />
        <Metric label="RAM" value={formatGb(vm.ram)} />
        <Metric label="Disco" value={formatGb(vm.disk)} />
      </dl>
      <div className="flex min-h-8 items-center justify-between gap-4">
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          {isPending && (
            <>
              <Loader2 className="size-4 animate-spin" />
              {PANEL_TEXT.saving}
            </>
          )}
        </p>
        <AdminOnly>
          <VmCardActions vm={vm} />
        </AdminOnly>
      </div>
    </article>
  );
}
