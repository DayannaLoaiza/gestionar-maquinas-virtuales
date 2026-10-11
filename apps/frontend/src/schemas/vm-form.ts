import { z } from 'zod';

import { CreateVirtualMachineDTO, VM_STATUSES, VmName } from '@vm/shared-types';

import type { UpdateVirtualMachineDTO, VirtualMachine } from '@vm/shared-types';

/**
 * Formulario de crear y editar una VM (RF-virtual-machines-16…20). Reutiliza los schemas de
 * `CreateVirtualMachineDTO` (mismas reglas y mensajes que la API, C10) y agrega lo propio del
 * formulario: los números llegan como texto y el nombre no puede repetir el de otra VM del listado.
 */

/** Mismo mensaje que el `409 VM_NAME_TAKEN` de la API (spec `virtual-machines`). */
export const VM_NAME_TAKEN_MESSAGE = 'Ya existe una máquina virtual con ese nombre';

/** Solo dígitos: `2.5`, `2,5`, `-1` o `1e3` no son un número entero escrito como tal. */
const WHOLE_NUMBER_TEXT = /^\d+$/;

/**
 * Un campo numérico escrito en un `<input type="text" inputMode="numeric">` (RF-virtual-machines-17).
 * Vacío → su mensaje de obligatorio; todo lo que no son solo dígitos → `NaN`, que el schema del DTO
 * rechaza con su propio mensaje, igual que un cero o un valor fuera de rango. Con
 * `type="number"`, `2,5` llegaría como `""` y se confundiría con un campo vacío.
 */
function numberField(requiredMessage: string, dtoField: z.ZodNumber) {
  return z
    .string()
    .trim()
    .min(1, { error: requiredMessage })
    .transform((text) => (WHOLE_NUMBER_TEXT.test(text) ? Number(text) : Number.NaN))
    .pipe(dtoField);
}

/** Los nombres se comparan recortados y sin distinguir mayúsculas, como en la base. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Los nombres de las demás VMs: en la edición, la propia queda afuera (RF-virtual-machines-18). */
export function otherVmNames(vms: readonly VirtualMachine[], ownId?: string): string[] {
  return vms.filter((vm) => vm.id !== ownId).map((vm) => vm.name);
}

/** El schema del formulario, con los nombres que ya usan las demás VMs. */
export function createVmFormSchema(otherNames: readonly string[]) {
  const takenNames = new Set(otherNames.map(normalizeName));
  return z.object({
    name: VmName.refine((name) => !takenNames.has(normalizeName(name)), {
      error: VM_NAME_TAKEN_MESSAGE,
    }),
    os: z.string().pipe(CreateVirtualMachineDTO.shape.os),
    cores: numberField('Ingresa los cores', CreateVirtualMachineDTO.shape.cores),
    ram: numberField('Ingresa la RAM', CreateVirtualMachineDTO.shape.ram),
    disk: numberField('Ingresa el disco', CreateVirtualMachineDTO.shape.disk),
    status: CreateVirtualMachineDTO.shape.status.unwrap(),
  });
}

export type VmFormSchema = ReturnType<typeof createVmFormSchema>;
/** Lo que tienen los campos: texto, salvo el estado. */
export type VmFormValues = z.input<VmFormSchema>;
/** Lo que sale del formulario válido: los campos del DTO, con números. */
export type VmFormOutput = z.output<VmFormSchema>;

/** Valores iniciales del formulario de creación: vacío y `Apagada` (RF-virtual-machines-16). */
export const EMPTY_VM_FORM: VmFormValues = {
  name: '',
  os: '',
  cores: '',
  ram: '',
  disk: '',
  status: VM_STATUSES.OFF,
};

/**
 * Los valores del formulario a partir de una VM (al abrir la edición, RF-virtual-machines-19) o de
 * un `CreateVirtualMachineDTO` (el borrador de una creación que falló, RF-virtual-machines-21).
 */
export function toVmFormValues(fields: CreateVirtualMachineDTO): VmFormValues {
  return {
    name: fields.name,
    os: fields.os,
    cores: String(fields.cores),
    ram: String(fields.ram),
    disk: String(fields.disk),
    status: fields.status ?? VM_STATUSES.OFF,
  };
}

/** Los campos de `vm` en la forma de la salida del formulario, para compararlos. */
export function toVmFormOutput(vm: VirtualMachine): VmFormOutput {
  return {
    name: vm.name,
    os: vm.os,
    cores: vm.cores,
    ram: vm.ram,
    disk: vm.disk,
    status: vm.status,
  };
}

/**
 * El cuerpo del `PUT` (RF-virtual-machines-20): **solo** los campos que cambiaron respecto de los
 * valores con los que se abrió el formulario, o `null` si no cambió ninguno. Compara los valores ya
 * transformados: un nombre que difiere solo en espacios de los extremos no es un cambio. Así un
 * cambio de otro Administrador hecho mientras el formulario estaba abierto no se pisa (hallazgo V1).
 */
export function buildUpdatePayload(
  initial: VmFormOutput,
  next: VmFormOutput,
): UpdateVirtualMachineDTO | null {
  const payload: UpdateVirtualMachineDTO = {};
  if (next.name !== initial.name) payload.name = next.name;
  if (next.os !== initial.os) payload.os = next.os;
  if (next.cores !== initial.cores) payload.cores = next.cores;
  if (next.ram !== initial.ram) payload.ram = next.ram;
  if (next.disk !== initial.disk) payload.disk = next.disk;
  if (next.status !== initial.status) payload.status = next.status;
  return Object.keys(payload).length === 0 ? null : payload;
}
