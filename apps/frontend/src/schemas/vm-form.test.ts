import { describe, expect, it } from 'vitest';

import { VM_OPERATING_SYSTEMS, VM_STATUSES } from '@vm/shared-types';

import { makeVm, vmId } from '@/test/vm-fixtures';

import {
  buildUpdatePayload,
  createVmFormSchema,
  otherVmNames,
  toVmFormOutput,
  VM_NAME_TAKEN_MESSAGE,
} from './vm-form';

import type { VmFormValues } from './vm-form';

const VALID: VmFormValues = {
  name: 'web-02',
  os: VM_OPERATING_SYSTEMS.UBUNTU,
  cores: '4',
  ram: '16',
  disk: '100',
  status: VM_STATUSES.OFF,
};

/** El mensaje del primer error de `field`, o `undefined` si el campo es válido. */
function fieldError(values: VmFormValues, field: keyof VmFormValues, otherNames: string[] = []) {
  const result = createVmFormSchema(otherNames).safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

const NUMBER_FIELDS = [
  {
    field: 'cores',
    required: 'Ingresa los cores',
    invalid: 'Los cores deben ser un número entero entre 1 y 128',
    aboveMax: '129',
  },
  {
    field: 'ram',
    required: 'Ingresa la RAM',
    invalid: 'La RAM debe ser un número entero de GB entre 1 y 1024',
    aboveMax: '1025',
  },
  {
    field: 'disk',
    required: 'Ingresa el disco',
    invalid: 'El disco debe ser un número entero de GB entre 1 y 65536',
    aboveMax: '65537',
  },
] as const;

describe('RF-virtual-machines-17 campos numéricos escritos como texto', () => {
  it.each(NUMBER_FIELDS)('$field vacío pide el valor', ({ field, required }) => {
    expect(fieldError({ ...VALID, [field]: '' }, field)).toBe(required);
    expect(fieldError({ ...VALID, [field]: '   ' }, field)).toBe(required);
  });

  it.each(NUMBER_FIELDS)(
    '$field con decimal, coma, texto, cero, negativo o fuera de rango da el mensaje del DTO',
    ({ field, invalid, aboveMax }) => {
      for (const text of ['2.5', '2,5', 'abc', '1e3', '0', '-1', aboveMax]) {
        expect(fieldError({ ...VALID, [field]: text }, field)).toBe(invalid);
      }
    },
  );

  it('convierte a número entero lo escrito, sin espacios', () => {
    const result = createVmFormSchema([]).parse({ ...VALID, cores: ' 4 ', ram: '1024', disk: '1' });

    expect(result).toMatchObject({ cores: 4, ram: 1024, disk: 1 });
    expect(typeof result.cores).toBe('number');
  });
});

describe('RF-virtual-machines-18 nombre único en el listado', () => {
  const vms = [makeVm({ id: vmId(1), name: 'WEB-01' }), makeVm({ id: vmId(2), name: 'db-01' })];
  /** El error del nombre tal como lo calcula el formulario: con los nombres de las demás VMs. */
  const nameError = (name: string, ownId?: string) =>
    fieldError({ ...VALID, name }, 'name', otherVmNames(vms, ownId));

  it('un nombre de otra VM está tomado sin distinguir mayúsculas ni espacios de los extremos', () => {
    expect(nameError('web-01')).toBe(VM_NAME_TAKEN_MESSAGE);
    expect(nameError('  web-01  ')).toBe(VM_NAME_TAKEN_MESSAGE);
    expect(nameError('web-02')).toBeUndefined();
  });

  it('la propia VM puede conservar su nombre o cambiarle solo las mayúsculas', () => {
    expect(nameError('WEB-01', vmId(1))).toBeUndefined();
    expect(nameError('Web-01', vmId(1))).toBeUndefined();
    expect(nameError('DB-01', vmId(1))).toBe(VM_NAME_TAKEN_MESSAGE);
  });
});

describe('RF-virtual-machines-20 la edición envía solo lo que cambió', () => {
  const vm = makeVm({ name: 'web-01', ram: 16, status: VM_STATUSES.OFF });
  const parse = (values: Partial<VmFormValues>) =>
    createVmFormSchema([]).parse({
      ...VALID,
      name: vm.name,
      cores: String(vm.cores),
      ram: String(vm.ram),
      disk: String(vm.disk),
      ...values,
    });

  it('devuelve solo los campos cambiados, con números', () => {
    expect(buildUpdatePayload(toVmFormOutput(vm), parse({ ram: '32' }))).toEqual({ ram: 32 });
  });

  it('sin cambios devuelve null', () => {
    expect(buildUpdatePayload(toVmFormOutput(vm), parse({}))).toBeNull();
  });

  it('un nombre que difiere solo en espacios de los extremos no es un cambio', () => {
    expect(buildUpdatePayload(toVmFormOutput(vm), parse({ name: ' web-01 ' }))).toBeNull();
  });

  it('no envía el estado si no se tocó, aunque otro lo haya cambiado mientras tanto', () => {
    const payload = buildUpdatePayload(toVmFormOutput(vm), parse({ name: 'Web-01' }));

    expect(payload).toEqual({ name: 'Web-01' });
    expect(payload).not.toHaveProperty('status');
  });
});
