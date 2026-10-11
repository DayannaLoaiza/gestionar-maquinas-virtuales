import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VM_STATUSES } from '@vm/shared-types';

import { applyConfirmedVm } from '@/lib/vms/vm-cache';
import { apiFail, apiOk, deferredResponse, stubApi } from '@/test/api-test-utils';
import { createTestQueryClient, vmProviders } from '@/test/query-test-utils';
import { makeVm, vmId } from '@/test/vm-fixtures';

import { useUpdateVm } from './use-update-vm';
import { useVisibleVms } from './use-visible-vms';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const PUT_PATH = `PUT /api/vms/${vmId(1)}`;
const VM = makeVm({ id: vmId(1), status: VM_STATUSES.OFF, updatedAt: '2026-10-11T10:00:00.000Z' });

function renderUpdate() {
  const queryClient = createTestQueryClient([VM]);
  const view = renderHook(() => ({ ...useVisibleVms(), ...useUpdateVm() }), {
    wrapper: vmProviders(queryClient),
  });
  return { queryClient, view };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('RF-virtual-machines-22 edición y encendido optimistas', () => {
  it('muestra el cambio al instante y pendiente; con 200, la versión del servidor', async () => {
    const put = deferredResponse();
    const saved = { ...VM, status: VM_STATUSES.ON, updatedAt: '2026-10-11T10:00:05.000Z' };
    stubApi({ [PUT_PATH]: [put], 'GET /api/vms': [apiOk({ items: [saved] })] });
    const { view } = renderUpdate();

    act(() => {
      view.result.current.update(vmId(1), { status: VM_STATUSES.ON }, 'switch');
    });

    await waitFor(() => {
      expect(view.result.current.vms[0]).toMatchObject({
        status: VM_STATUSES.ON,
        pending: 'update',
      });
    });

    put.resolve(apiOk({ item: saved }));

    await waitFor(() => {
      expect(view.result.current.vms[0]).toMatchObject({
        status: VM_STATUSES.ON,
        pending: null,
        updatedAt: saved.updatedAt,
      });
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('si falla, vuelve a la versión confirmada más reciente, también una que llegó mientras tanto', async () => {
    const put = deferredResponse();
    stubApi({ [PUT_PATH]: [put], 'GET /api/vms': [apiOk({ items: [VM] })] });
    const { queryClient, view } = renderUpdate();

    act(() => {
      view.result.current.update(vmId(1), { status: VM_STATUSES.ON }, 'switch');
    });
    // Mientras el PUT sigue en curso, otro Administrador renombra la VM (llega por un evento).
    act(() => {
      applyConfirmedVm(queryClient, {
        ...VM,
        name: 'renombrada',
        updatedAt: '2026-10-11T10:00:03.000Z',
      });
    });
    put.resolve(apiFail(500, 'INTERNAL_ERROR', 'Internal server error'));

    await waitFor(() => {
      expect(view.result.current.vms[0]).toMatchObject({
        name: 'renombrada',
        status: VM_STATUSES.OFF,
        pending: null,
      });
    });
    expect(toast.error).toHaveBeenCalledWith(
      'No se pudo cambiar el estado de la máquina virtual',
      expect.anything(),
    );
  });

  it('con 404, la VM sale del listado y el toast lleva el mensaje de la API', async () => {
    const message = 'La máquina virtual no existe o fue eliminada';
    stubApi({
      [PUT_PATH]: [apiFail(404, 'VM_NOT_FOUND', message)],
      'GET /api/vms': [apiOk({ items: [] })],
    });
    const { view } = renderUpdate();

    act(() => {
      view.result.current.update(vmId(1), { ram: 32 }, 'form');
    });

    await waitFor(() => {
      expect(view.result.current.vms).toEqual([]);
    });
    expect(toast.error).toHaveBeenCalledWith(message, expect.anything());
  });
});
