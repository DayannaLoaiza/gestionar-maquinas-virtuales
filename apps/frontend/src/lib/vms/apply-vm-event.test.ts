import { describe, expect, it } from 'vitest';

import { VM_STATUSES } from '@vm/shared-types';

import { createTestQueryClient } from '@/test/query-test-utils';
import { makeVm, vmId } from '@/test/vm-fixtures';

import { applyVmEvent } from './apply-vm-event';
import { deriveVisibleVms } from './pending-changes';
import { cachedVms, pendingVmChanges } from './vm-cache';
import { VMS_MUTATION_KEY, VMS_QUERY_KEY } from './vms-query';

import type { PendingVmChange } from './pending-changes';
import type { QueryClient } from '@tanstack/react-query';

const OFF_AT_10 = makeVm({ status: VM_STATUSES.OFF, updatedAt: '2026-10-11T10:00:00.000Z' });
const ON_AT_11 = { ...OFF_AT_10, status: VM_STATUSES.ON, updatedAt: '2026-10-11T11:00:00.000Z' };

/** Una mutación de `['vms']` que queda pendiente para siempre (el pedido no responde). */
function startPendingChange(queryClient: QueryClient, change: PendingVmChange): void {
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationKey: VMS_MUTATION_KEY,
    mutationFn: () => new Promise<never>(() => undefined),
  });
  void mutation.execute(change);
}

const visible = (queryClient: QueryClient) =>
  deriveVisibleVms(cachedVms(queryClient) ?? [], pendingVmChanges(queryClient));

describe('RF-realtime-vm-status-12 aplicar un evento sobre el listado', () => {
  it('una versión más nueva reemplaza a la que hay y cambia el estado que se ve', () => {
    const queryClient = createTestQueryClient([OFF_AT_10]);

    expect(applyVmEvent(queryClient, ON_AT_11)).toBe(true);
    expect(visible(queryClient)[0]?.status).toBe(VM_STATUSES.ON);
  });

  it('una versión más vieja se descarta', () => {
    const queryClient = createTestQueryClient([ON_AT_11]);

    expect(applyVmEvent(queryClient, OFF_AT_10)).toBe(false);
    expect(visible(queryClient)[0]?.status).toBe(VM_STATUSES.ON);
  });

  it('si la VM no está en el listado, lo vuelve a pedir', () => {
    const queryClient = createTestQueryClient([makeVm({ id: vmId(2) })]);

    applyVmEvent(queryClient, ON_AT_11);

    expect(queryClient.getQueryState(VMS_QUERY_KEY)?.isInvalidated).toBe(true);
    expect(visible(queryClient).map((vm) => vm.id)).toEqual([vmId(2)]);
  });

  it('una VM con una eliminación pendiente no reaparece', () => {
    const queryClient = createTestQueryClient([OFF_AT_10]);
    startPendingChange(queryClient, { kind: 'delete', id: OFF_AT_10.id });

    expect(applyVmEvent(queryClient, ON_AT_11)).toBe(false);
    expect(visible(queryClient)).toEqual([]);
  });

  it('en la pestaña que hizo el cambio, el estado ya se veía: no hay cambio que resaltar', () => {
    const queryClient = createTestQueryClient([OFF_AT_10]);
    startPendingChange(queryClient, {
      kind: 'update',
      id: OFF_AT_10.id,
      changes: { status: VM_STATUSES.ON },
      origin: 'switch',
    });

    expect(applyVmEvent(queryClient, ON_AT_11)).toBe(false);
    expect(visible(queryClient)[0]?.status).toBe(VM_STATUSES.ON);
  });
});
