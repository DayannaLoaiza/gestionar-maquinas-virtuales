import { z } from 'zod';

import {
  VM_LIMITS,
  VM_NAME_PATTERN,
  VM_OPERATING_SYSTEM_VALUES,
  VM_STATUS_VALUES,
} from '../virtual-machines/virtual-machine';

/** Entero dentro de los límites, sin coerción: `"4"`, `2.5`, `null` y `true` fallan. */
function wholeNumberBetween(limits: { min: number; max: number }, message: string) {
  return z
    .number({ error: message })
    .int({ error: message })
    .min(limits.min, { error: message })
    .max(limits.max, { error: message });
}

/** Nombre recortado; único sin distinguir mayúsculas (lo garantiza la base, RF-virtual-machines-06). */
export const VmName = z
  .string({ error: 'Ingresa un nombre' })
  .trim()
  .min(1, { error: 'Ingresa un nombre' })
  .max(VM_LIMITS.name.maxLength, {
    error: `El nombre admite hasta ${String(VM_LIMITS.name.maxLength)} caracteres`,
  })
  .regex(VM_NAME_PATTERN, {
    error:
      'Usa solo letras sin tilde, números, guiones, guiones bajos y puntos, y empieza y termina con letra o número',
  });

/** Campos de una VM (RF-virtual-machines-05). Las claves ajenas se descartan: nadie fija `id`. */
export const CreateVirtualMachineDTO = z.object({
  name: VmName,
  cores: wholeNumberBetween(
    VM_LIMITS.cores,
    `Los cores deben ser un número entero entre ${String(VM_LIMITS.cores.min)} y ${String(VM_LIMITS.cores.max)}`,
  ),
  ram: wholeNumberBetween(
    VM_LIMITS.ram,
    `La RAM debe ser un número entero de GB entre ${String(VM_LIMITS.ram.min)} y ${String(VM_LIMITS.ram.max)}`,
  ),
  disk: wholeNumberBetween(
    VM_LIMITS.disk,
    `El disco debe ser un número entero de GB entre ${String(VM_LIMITS.disk.min)} y ${String(VM_LIMITS.disk.max)}`,
  ),
  os: z.enum(VM_OPERATING_SYSTEM_VALUES, { error: 'Elige un sistema operativo de la lista' }),
  /** Si no se envía, la VM nace `Apagada`. */
  status: z.enum(VM_STATUS_VALUES, { error: 'El estado debe ser Encendida o Apagada' }).optional(),
});
export type CreateVirtualMachineDTO = z.infer<typeof CreateVirtualMachineDTO>;

/** Los mismos campos, todos opcionales; al menos uno (RF-virtual-machines-07, RF-virtual-machines-08). */
export const UpdateVirtualMachineDTO = CreateVirtualMachineDTO.partial().refine(
  (changes) => Object.values(changes).some((value) => value !== undefined),
  { error: 'Envía al menos un campo para actualizar' },
);
export type UpdateVirtualMachineDTO = z.infer<typeof UpdateVirtualMachineDTO>;
