'use client';

import { AdminOnly } from '@/components/auth/admin-only';
import { useAuthStore } from '@/components/auth/use-auth-store';
import { EmptyState } from '@/components/feedback/empty-state';
import { Server2 } from '@/components/svg/server-2';
import { PANEL_TEXT } from '@/config/panel';
import { selectUser } from '@/lib/auth/auth-store';
import { isAdmin } from '@/lib/auth/auth-user';

import { CreateVmButton } from './create-vm-button';
import { VMS_HEADING_ID } from './dialog-focus';
import { VmCard } from './vm-card';

import type { VisibleVm } from '@/lib/vms/pending-changes';

/** Sin VMs: al Administrador lo invita a crear la primera; al Cliente, no (RF-virtual-machines-15). */
function VmsEmptyState() {
  const isAdminUser = isAdmin(useAuthStore(selectUser));
  return (
    <EmptyState
      icon={Server2}
      titleAs="h3"
      title={PANEL_TEXT.emptyTitle}
      description={
        isAdminUser ? PANEL_TEXT.emptyAdminDescription : PANEL_TEXT.emptyClientDescription
      }
      action={
        isAdminUser ? (
          <AdminOnly>
            <CreateVmButton />
          </AdminOnly>
        ) : undefined
      }
    />
  );
}

/** El listado de VMs en tarjetas, en el orden de la API (RF-virtual-machines-13). */
export function VmGrid({ vms }: Readonly<{ vms: VisibleVm[] }>) {
  return (
    <section aria-labelledby={VMS_HEADING_ID} className="flex flex-col gap-4">
      <h2
        id={VMS_HEADING_ID}
        tabIndex={-1}
        className="text-xl font-semibold font-stretch-semi-expanded outline-none"
      >
        {PANEL_TEXT.vmsHeading}
      </h2>
      {vms.length === 0 ? (
        <VmsEmptyState />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vms.map((vm) => (
            <li key={vm.id} className="min-w-0">
              <VmCard vm={vm} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
