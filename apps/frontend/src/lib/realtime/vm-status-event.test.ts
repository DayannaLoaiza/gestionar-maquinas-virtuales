import { describe, expect, it } from 'vitest';

import { makeVm } from '@/test/vm-fixtures';

import { readVmStatusChangedEvent } from './vm-status-event';

describe('RF-realtime-vm-status-12 guarda del payload de vm:status-changed', () => {
  it('acepta una VirtualMachine completa y copia solo los campos del modelo', () => {
    const vm = makeVm();

    expect(readVmStatusChangedEvent({ item: { ...vm, createdBy: 'u-1' } })).toEqual(vm);
  });

  it.each([
    ['sin payload', null],
    ['sin item', {}],
    ['estado en minúscula', { item: { ...makeVm(), status: 'encendida' } }],
    ['sistema operativo fuera del catálogo', { item: { ...makeVm(), os: 'Windows 11' } }],
    ['cores con decimales', { item: { ...makeVm(), cores: 2.5 } }],
    ['RAM como texto', { item: { ...makeVm(), ram: '16' } }],
    ['sin updatedAt', { item: { ...makeVm(), updatedAt: undefined } }],
    ['fecha inválida', { item: { ...makeVm(), createdAt: 'ayer' } }],
    ['fecha que no es ISO 8601', { item: { ...makeVm(), updatedAt: 'March 7, 2026' } }],
    ['sin id', { item: { ...makeVm(), id: '' } }],
    ['cores fuera de rango', { item: { ...makeVm(), cores: 0 } }],
    ['disco por encima del máximo', { item: { ...makeVm(), disk: 1e9 } }],
    ['nombre que la API no acepta', { item: { ...makeVm(), name: '<b>web</b>' } }],
  ])('ignora un evento %s', (_case, payload) => {
    expect(readVmStatusChangedEvent(payload)).toBeNull();
  });
});
