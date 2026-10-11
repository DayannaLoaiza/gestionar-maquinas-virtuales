import { describe, expect, it } from 'vitest';

import { VM_STATUSES } from '@vm/shared-types';

import { makeVm, vmId } from '@/test/vm-fixtures';

import { mergeFetchedVms, removeConfirmed, upsertConfirmed } from './vm-versions';

const OLDER = '2026-10-01T10:00:00.000Z';
const NEWER = '2026-10-01T10:05:00.000Z';

describe('RF-virtual-machines-24 versiones confirmadas', () => {
  it('reemplaza una VM por una versión más nueva y descarta una más vieja', () => {
    const current = makeVm({ updatedAt: NEWER, status: VM_STATUSES.ON });
    const list = [current];

    const withOlder = upsertConfirmed(list, makeVm({ updatedAt: OLDER, status: VM_STATUSES.OFF }));
    const withNewer = upsertConfirmed(
      list,
      makeVm({ updatedAt: '2026-10-01T10:06:00.000Z', status: VM_STATUSES.OFF }),
    );

    expect(withOlder).toBe(list);
    expect(withNewer[0]?.status).toBe(VM_STATUSES.OFF);
  });

  it('inserta una VM que no estaba en su lugar del orden de creación', () => {
    const newest = makeVm({ id: vmId(1), createdAt: '2026-10-03T00:00:00.000Z' });
    const oldest = makeVm({ id: vmId(2), createdAt: '2026-10-01T00:00:00.000Z' });
    const middle = makeVm({ id: vmId(3), createdAt: '2026-10-02T00:00:00.000Z' });

    const list = upsertConfirmed([newest, oldest], middle);

    expect(list.map((vm) => vm.id)).toEqual([vmId(1), vmId(3), vmId(2)]);
  });

  it('quita una VM eliminada', () => {
    const list = [makeVm({ id: vmId(1) }), makeVm({ id: vmId(2) })];

    expect(removeConfirmed(list, vmId(1)).map((vm) => vm.id)).toEqual([vmId(2)]);
  });

  it('al recargar, la lista nueva manda en qué VMs hay y en su orden', () => {
    const previous = [makeVm({ id: vmId(1) }), makeVm({ id: vmId(2) })];
    const fetched = [makeVm({ id: vmId(3) }), makeVm({ id: vmId(1) })];

    expect(mergeFetchedVms(previous, fetched).map((vm) => vm.id)).toEqual([vmId(3), vmId(1)]);
  });

  it('al recargar, una respuesta atrasada no pisa una versión más nueva (p. ej. de un evento)', () => {
    const fromEvent = makeVm({ updatedAt: NEWER, status: VM_STATUSES.ON });
    const stale = makeVm({ updatedAt: OLDER, status: VM_STATUSES.OFF });

    const merged = mergeFetchedVms([fromEvent], [stale]);

    expect(merged[0]).toBe(fromEvent);
  });

  it('a igual versión con otro contenido gana la que llega, también al recargar', () => {
    const cached = makeVm({ updatedAt: NEWER, status: VM_STATUSES.OFF });
    const incoming = makeVm({ updatedAt: NEWER, status: VM_STATUSES.ON });

    expect(mergeFetchedVms([cached], [incoming])[0]?.status).toBe(VM_STATUSES.ON);
  });

  it('al recargar sin cambios, conserva la misma lista', () => {
    const previous = [makeVm({ id: vmId(1) })];

    expect(mergeFetchedVms(previous, [makeVm({ id: vmId(1) })])).toBe(previous);
  });
});
