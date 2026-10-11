import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { VM_STATUSES } from '@vm/shared-types';

import {
  VmNameTakenException,
  VmNotFoundException,
} from '@/shared/exceptions/virtual-machine.exceptions';

import { VM_EVENTS } from './virtual-machine.events';
import { VirtualMachineRepository } from './virtual-machine.repository';

import type { VirtualMachineEntity } from './virtual-machine.entity';
import type { NameTaken, NotFound, VirtualMachineChanges } from './virtual-machine.repository';
import type {
  AuthUser,
  CreateVirtualMachineDTO,
  UpdateVirtualMachineDTO,
  VirtualMachine,
  VmStatusChangedEvent,
} from '@vm/shared-types';

@Injectable()
export class VirtualMachinesService {
  private readonly logger = new Logger(VirtualMachinesService.name);

  constructor(
    private readonly repository: VirtualMachineRepository,
    private readonly events: EventEmitter2,
  ) {}

  /** Todas las VMs, sin paginar (RF-virtual-machines-01). */
  async list(): Promise<VirtualMachine[]> {
    const vms = await this.repository.findAllNewestFirst();
    return vms.map((vm) => this.toVirtualMachine(vm));
  }

  /** Cuántas VMs hay. El seed carga las de ejemplo solo si no hay ninguna (RF-virtual-machines-28). */
  count(): Promise<number> {
    return this.repository.count();
  }

  /** Sin `status`, la VM nace `Apagada` (RF-virtual-machines-03). */
  async create(input: CreateVirtualMachineDTO, actor: AuthUser): Promise<VirtualMachine> {
    const result = await this.repository.insert({
      ...input,
      status: input.status ?? VM_STATUSES.OFF,
      createdById: actor.id,
    });
    const { vm } = this.savedOrThrow(result);

    this.logger.log(`VM creada: vmId=${vm.id} (userId=${actor.id})`);
    return this.toVirtualMachine(vm);
  }

  /**
   * Cambia solo los campos recibidos (RF-virtual-machines-07). Si el estado cambió de verdad, lo
   * anuncia una vez guardado, y `realtime` lo difunde a todas las conexiones
   * (RF-realtime-vm-status-05). Reenviar el mismo estado no anuncia nada (RF-realtime-vm-status-06).
   */
  async update(
    id: string,
    input: UpdateVirtualMachineDTO,
    actor: AuthUser,
  ): Promise<VirtualMachine> {
    const changes = this.definedChanges(input);
    const { vm, previousStatus } = this.savedOrThrow(await this.repository.updateById(id, changes));

    this.logger.log(
      `VM actualizada: vmId=${vm.id}, campos=${Object.keys(changes).join(',')} (userId=${actor.id})`,
    );
    const item = this.toVirtualMachine(vm);
    if (previousStatus !== vm.status) this.announceStatusChange(item);
    return item;
  }

  /** Borrado definitivo (RF-virtual-machines-09). */
  async remove(id: string, actor: AuthUser): Promise<void> {
    const wasDeleted = await this.repository.deleteById(id);
    if (!wasDeleted) throw new VmNotFoundException();

    this.logger.log(`VM eliminada: vmId=${id} (userId=${actor.id})`);
  }

  private savedOrThrow<Saved extends { outcome: 'saved' }>(
    result: Saved | NameTaken | NotFound,
  ): Saved {
    if (result.outcome === 'name-taken') throw new VmNameTakenException();
    if (result.outcome === 'not-found') throw new VmNotFoundException();
    return result;
  }

  /**
   * `emit` no espera a los listeners ni recibe sus errores (`realtime` escucha con `async: true`):
   * si la difusión falla, el `PUT` ya respondió con la VM guardada (RF-realtime-vm-status-07).
   */
  private announceStatusChange(item: VirtualMachine): void {
    const event: VmStatusChangedEvent = { item };
    this.events.emit(VM_EVENTS.STATUS_CHANGED, event);
  }

  /** Solo las claves que llegaron: una clave ausente nunca se escribe como `NULL`. */
  private definedChanges(input: UpdateVirtualMachineDTO): VirtualMachineChanges {
    const changes: VirtualMachineChanges = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.cores !== undefined) changes.cores = input.cores;
    if (input.ram !== undefined) changes.ram = input.ram;
    if (input.disk !== undefined) changes.disk = input.disk;
    if (input.os !== undefined) changes.os = input.os;
    if (input.status !== undefined) changes.status = input.status;
    return changes;
  }

  /** Lo único que sale de la API sobre una VM: nunca el creador (RF-virtual-machines-11). */
  private toVirtualMachine(vm: VirtualMachineEntity): VirtualMachine {
    return {
      id: vm.id,
      name: vm.name,
      cores: vm.cores,
      ram: vm.ram,
      disk: vm.disk,
      os: vm.os,
      status: vm.status,
      createdAt: vm.createdAt.toISOString(),
      updatedAt: vm.updatedAt.toISOString(),
    };
  }
}
