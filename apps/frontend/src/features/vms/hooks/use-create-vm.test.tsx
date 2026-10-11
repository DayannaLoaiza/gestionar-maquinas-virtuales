import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VM_OPERATING_SYSTEMS, VM_STATUSES } from '@vm/shared-types';

import { VM_NAME_TAKEN_MESSAGE } from '@/schemas/vm-form';
import { apiFail, apiOk, deferredResponse, stubApi } from '@/test/api-test-utils';
import { createTestQueryClient, vmProviders } from '@/test/query-test-utils';
import { makeVm, vmId } from '@/test/vm-fixtures';

import { useCreateVm } from './use-create-vm';
import { useVisibleVms } from './use-visible-vms';
import { useVmDialogs } from '../store/vm-dialogs-provider';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const DTO = {
  name: 'nueva-01',
  cores: 2,
  ram: 4,
  disk: 50,
  os: VM_OPERATING_SYSTEMS.DEBIAN,
  status: VM_STATUSES.ON,
};
const EXISTING = makeVm({ id: vmId(1), createdAt: '2026-10-01T10:00:00.000Z' });
const CREATED = makeVm({
  ...DTO,
  id: vmId(2),
  createdAt: '2026-10-11T10:00:00.000Z',
  updatedAt: '2026-10-11T10:00:00.000Z',
});

function renderCreate() {
  const queryClient = createTestQueryClient([EXISTING]);
  const view = renderHook(
    () => ({
      ...useVisibleVms(),
      ...useCreateVm(),
      dialog: useVmDialogs((state) => state.current),
    }),
    { wrapper: vmProviders(queryClient) },
  );
  return { queryClient, view };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('RF-virtual-machines-21 creación optimista', () => {
  it('muestra la VM al instante, primera y pendiente; con 201, la versión del servidor', async () => {
    const post = deferredResponse();
    stubApi({ 'POST /api/vms': [post], 'GET /api/vms': [apiOk({ items: [CREATED, EXISTING] })] });
    const { view } = renderCreate();

    act(() => {
      view.result.current.create(DTO);
    });

    await waitFor(() => {
      expect(view.result.current.vms[0]).toMatchObject({ name: 'nueva-01', pending: 'create' });
    });
    expect(view.result.current.vms).toHaveLength(2);

    post.resolve(apiOk({ item: CREATED }, 201));

    await waitFor(() => {
      expect(view.result.current.vms.map((vm) => [vm.id, vm.pending])).toEqual([
        [vmId(2), null],
        [vmId(1), null],
      ]);
    });
    expect(toast.success).toHaveBeenCalledWith('Máquina virtual creada', {});
  });

  it('con 409, la VM desaparece, hay toast y el formulario se reabre con el borrador y el error', async () => {
    stubApi({
      'POST /api/vms': [apiFail(409, 'VM_NAME_TAKEN', VM_NAME_TAKEN_MESSAGE)],
      'GET /api/vms': [apiOk({ items: [EXISTING] })],
    });
    const { view } = renderCreate();

    act(() => {
      view.result.current.create(DTO);
    });

    await waitFor(() => {
      expect(view.result.current.dialog).toMatchObject({
        kind: 'create',
        nameError: VM_NAME_TAKEN_MESSAGE,
        draft: { name: 'nueva-01', cores: '2', ram: '4', disk: '50', status: VM_STATUSES.ON },
      });
    });
    expect(view.result.current.vms.map((vm) => vm.id)).toEqual([vmId(1)]);
    expect(toast.error).toHaveBeenCalledWith(VM_NAME_TAKEN_MESSAGE, expect.anything());
  });

  it('con un error del servidor, el toast usa el texto de la pantalla', async () => {
    stubApi({
      'POST /api/vms': [apiFail(500, 'INTERNAL_ERROR', 'Internal server error')],
      'GET /api/vms': [apiOk({ items: [EXISTING] })],
    });
    const { view } = renderCreate();

    act(() => {
      view.result.current.create(DTO);
    });

    await waitFor(() => {
      expect(view.result.current.dialog).toMatchObject({ kind: 'create', nameError: null });
    });
    expect(toast.error).toHaveBeenCalledWith(
      'No se pudo crear la máquina virtual',
      expect.anything(),
    );
  });
});

describe('RF-virtual-machines-24 una carga vieja no deshace una creación', () => {
  it('una recarga que salió antes de que el POST respondiera no hace desaparecer la VM creada', async () => {
    const post = deferredResponse();
    const staleList = deferredResponse();
    stubApi({
      'POST /api/vms': [post],
      'GET /api/vms': [staleList, apiOk({ items: [CREATED, EXISTING] })],
    });
    const { queryClient, view } = renderCreate();

    act(() => {
      view.result.current.create(DTO);
    });
    act(() => {
      void queryClient.refetchQueries();
    });
    post.resolve(apiOk({ item: CREATED }, 201));
    await waitFor(() => {
      expect(view.result.current.vms[0]).toMatchObject({ id: vmId(2), pending: null });
    });

    // La respuesta vieja (sin la VM nueva) llega después: la caché la descarta.
    staleList.resolve(apiOk({ items: [EXISTING] }));

    await waitFor(() => {
      expect(view.result.current.query.isFetching).toBe(false);
    });
    expect(view.result.current.vms.map((vm) => vm.id)).toEqual([vmId(2), vmId(1)]);
  });
});
