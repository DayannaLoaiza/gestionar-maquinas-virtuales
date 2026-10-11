import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFail, apiNoContent, apiOk, deferredResponse, stubApi } from '@/test/api-test-utils';
import { createTestQueryClient, vmProviders } from '@/test/query-test-utils';
import { makeVm, vmId } from '@/test/vm-fixtures';

import { useDeleteVm } from './use-delete-vm';
import { useVisibleVms } from './use-visible-vms';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const VMS = [makeVm({ id: vmId(1) }), makeVm({ id: vmId(2) }), makeVm({ id: vmId(3) })];
const DELETE_PATH = `DELETE /api/vms/${vmId(2)}`;

function renderDelete() {
  const queryClient = createTestQueryClient(VMS);
  const view = renderHook(() => ({ ...useVisibleVms(), ...useDeleteVm() }), {
    wrapper: vmProviders(queryClient),
  });
  return view;
}

const ids = (vms: { id: string }[]) => vms.map((vm) => vm.id);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('RF-virtual-machines-23 eliminación optimista', () => {
  it('oculta la VM al instante; con 204 sigue fuera y hay toast de éxito', async () => {
    const response = deferredResponse();
    stubApi({
      [DELETE_PATH]: [response],
      'GET /api/vms': [apiOk({ items: [VMS[0], VMS[2]] })],
    });
    const view = renderDelete();

    act(() => {
      view.result.current.remove(vmId(2));
    });

    await waitFor(() => {
      expect(ids(view.result.current.vms)).toEqual([vmId(1), vmId(3)]);
    });

    response.resolve(apiNoContent());

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Máquina virtual eliminada', {});
    });
    expect(ids(view.result.current.vms)).toEqual([vmId(1), vmId(3)]);
  });

  it('con 404 sigue fuera y avisa que ya había sido eliminada', async () => {
    stubApi({
      [DELETE_PATH]: [apiFail(404, 'VM_NOT_FOUND', 'La máquina virtual no existe o fue eliminada')],
      'GET /api/vms': [apiOk({ items: [VMS[0], VMS[2]] })],
    });
    const view = renderDelete();

    act(() => {
      view.result.current.remove(vmId(2));
    });

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith('La máquina virtual ya había sido eliminada', {});
    });
    expect(ids(view.result.current.vms)).toEqual([vmId(1), vmId(3)]);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('con un error del servidor, reaparece en la misma posición y hay toast de error', async () => {
    stubApi({
      [DELETE_PATH]: [apiFail(500, 'INTERNAL_ERROR', 'Internal server error')],
      'GET /api/vms': [apiOk({ items: VMS })],
    });
    const view = renderDelete();

    act(() => {
      view.result.current.remove(vmId(2));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'No se pudo eliminar la máquina virtual',
        expect.anything(),
      );
    });
    expect(ids(view.result.current.vms)).toEqual([vmId(1), vmId(2), vmId(3)]);
  });
});
