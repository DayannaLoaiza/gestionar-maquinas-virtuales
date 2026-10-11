import { describe, expect, it } from 'vitest';

import { VM_OPERATING_SYSTEMS, VM_STATUSES } from '@vm/shared-types';

import { makeVm, vmId } from '@/test/vm-fixtures';

import { deriveVisibleVms } from './pending-changes';

import type { PendingVmChange } from './pending-changes';

const CREATE_DTO = {
  name: 'nueva-01',
  cores: 2,
  ram: 4,
  disk: 50,
  os: VM_OPERATING_SYSTEMS.DEBIAN,
};

function creation(tempId: string, submittedAt: string): PendingVmChange {
  return { kind: 'create', tempId, dto: { ...CREATE_DTO, name: tempId }, submittedAt };
}

describe('RF-virtual-machines-24 lo que se ve: confirmadas más cambios pendientes', () => {
  it('muestra las creaciones pendientes primero, la más reciente arriba, apagadas por defecto', () => {
    const confirmed = [makeVm({ id: vmId(1) })];
    const pending = [
      creation('tmp-a', '2026-10-11T10:00:00.000Z'),
      creation('tmp-b', '2026-10-11T10:00:05.000Z'),
    ];

    const visible = deriveVisibleVms(confirmed, pending);

    expect(visible.map((vm) => [vm.id, vm.pending])).toEqual([
      ['tmp-b', 'create'],
      ['tmp-a', 'create'],
      [vmId(1), null],
    ]);
    expect(visible[0]?.status).toBe(VM_STATUSES.OFF);
  });

  it('aplica una edición pendiente solo en los campos enviados', () => {
    const confirmed = [makeVm({ id: vmId(1), ram: 16, status: VM_STATUSES.OFF })];
    const pending: PendingVmChange[] = [
      { kind: 'update', id: vmId(1), changes: { status: VM_STATUSES.ON }, origin: 'switch' },
    ];

    const [vm] = deriveVisibleVms(confirmed, pending);

    expect(vm).toMatchObject({ status: VM_STATUSES.ON, ram: 16, pending: 'update' });
  });

  it('oculta una VM con una eliminación pendiente', () => {
    const confirmed = [makeVm({ id: vmId(1) }), makeVm({ id: vmId(2) })];

    const visible = deriveVisibleVms(confirmed, [{ kind: 'delete', id: vmId(1) }]);

    expect(visible.map((vm) => vm.id)).toEqual([vmId(2)]);
  });

  it('si el cambio deja de estar pendiente (falló), se ve la versión confirmada más reciente', () => {
    const fromEvent = makeVm({
      id: vmId(1),
      status: VM_STATUSES.ON,
      updatedAt: '2026-10-11T10:00:09.000Z',
    });

    const [vm] = deriveVisibleVms([fromEvent], []);

    expect(vm).toMatchObject({ status: VM_STATUSES.ON, pending: null });
  });

  it('una creación pendiente no se ve dos veces cuando su VM ya está confirmada', () => {
    const confirmedCreation = makeVm({ id: vmId(9), name: 'TMP-A' });

    const visible = deriveVisibleVms(
      [confirmedCreation],
      [creation('tmp-a', '2026-10-11T10:00:00.000Z')],
    );

    expect(visible.map((vm) => [vm.id, vm.pending])).toEqual([[vmId(9), null]]);
  });

  it('una creación pendiente se ve si la VM con ese nombre se está eliminando', () => {
    const deleting = makeVm({ id: vmId(9), name: 'tmp-a' });

    const visible = deriveVisibleVms(
      [deleting],
      [{ kind: 'delete', id: vmId(9) }, creation('tmp-a', '2026-10-11T10:00:00.000Z')],
    );

    expect(visible.map((vm) => vm.id)).toEqual(['tmp-a']);
  });

  it('una recarga del listado no deshace los cambios pendientes', () => {
    const pending: PendingVmChange[] = [
      creation('tmp-a', '2026-10-11T10:00:00.000Z'),
      { kind: 'delete', id: vmId(2) },
    ];
    const reloaded = [makeVm({ id: vmId(1) }), makeVm({ id: vmId(2) })];

    const visible = deriveVisibleVms(reloaded, pending);

    expect(visible.map((vm) => vm.id)).toEqual(['tmp-a', vmId(1)]);
  });
});
