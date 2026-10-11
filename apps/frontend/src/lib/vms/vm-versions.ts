import type { VirtualMachine } from '@vm/shared-types';

/**
 * Versiones **confirmadas** de las VMs: lo que el servidor devolvió en un `GET`, un `POST`, un `PUT`
 * o un evento de tiempo real. Entre dos versiones de la misma VM gana la de `updatedAt` más reciente
 * (RF-virtual-machines-24). Los cambios optimistas nunca entran acá: se dibujan encima
 * (`pending-changes.ts`).
 */

/** `updatedAt` como instante: comparar el texto fallaría con dos formatos ISO distintos. */
function versionTime(vm: VirtualMachine): number {
  return Date.parse(vm.updatedAt);
}

/** `true` si `incoming` es igual o más nueva que `current`: a igual versión, gana la que llega. */
export function isNewerOrSame(incoming: VirtualMachine, current: VirtualMachine): boolean {
  return versionTime(incoming) >= versionTime(current);
}

const VM_FIELDS = [
  'id',
  'name',
  'cores',
  'ram',
  'disk',
  'os',
  'status',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof VirtualMachine)[];

function hasSameFields(a: VirtualMachine, b: VirtualMachine): boolean {
  return VM_FIELDS.every((field) => a[field] === b[field]);
}

/**
 * La versión que queda entre la que había y la que llega, con la regla de `isNewerOrSame`. Si son
 * iguales campo por campo, se conserva la que había (misma referencia: nada se vuelve a dibujar).
 */
function pickVersion(current: VirtualMachine, incoming: VirtualMachine): VirtualMachine {
  if (!isNewerOrSame(incoming, current)) return current;
  return hasSameFields(current, incoming) ? current : incoming;
}

/** Posición de una VM nueva en el orden de la API: de la creada más recientemente a la más antigua. */
function insertionIndex(list: readonly VirtualMachine[], vm: VirtualMachine): number {
  const createdAt = Date.parse(vm.createdAt);
  const index = list.findIndex((item) => Date.parse(item.createdAt) < createdAt);
  return index === -1 ? list.length : index;
}

/**
 * La lista con `vm` como versión confirmada: la reemplaza si es igual o más nueva que la que hay, o
 * la inserta en su lugar del orden si no estaba. Si la que llega es más vieja, devuelve la misma
 * lista (misma referencia: nada cambia en pantalla).
 */
export function upsertConfirmed(list: VirtualMachine[], vm: VirtualMachine): VirtualMachine[] {
  const index = list.findIndex((item) => item.id === vm.id);
  if (index === -1) return list.toSpliced(insertionIndex(list, vm), 0, vm);

  const current = list[index];
  if (current !== undefined && !isNewerOrSame(vm, current)) return list;
  return list.with(index, vm);
}

/** La lista sin la VM `id` (eliminada en el servidor). */
export function removeConfirmed(list: VirtualMachine[], id: string): VirtualMachine[] {
  return list.filter((item) => item.id !== id);
}

/**
 * Une una lista recién pedida con la que había. La nueva manda en **qué** VMs hay y en su orden; de
 * cada VM que está en las dos, se queda la versión más nueva. Así una respuesta atrasada nunca pisa
 * un evento más reciente. Si nada cambió, devuelve la lista anterior (misma referencia).
 */
export function mergeFetchedVms(
  previous: VirtualMachine[] | undefined,
  fetched: VirtualMachine[],
): VirtualMachine[] {
  if (previous === undefined) return fetched;

  const previousById = new Map(previous.map((vm) => [vm.id, vm]));
  const merged = fetched.map((vm) => {
    const current = previousById.get(vm.id);
    return current === undefined ? vm : pickVersion(current, vm);
  });

  const isUnchanged =
    merged.length === previous.length && merged.every((vm, index) => vm === previous[index]);
  return isUnchanged ? previous : merged;
}
