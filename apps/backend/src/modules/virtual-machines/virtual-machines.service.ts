import { Injectable, Logger } from '@nestjs/common';

import { VM_STATUSES } from '@vm/shared-types';

import {
  VmNameTakenException,
  VmNotFoundException,
} from '@/shared/exceptions/virtual-machine.exceptions';

import { VirtualMachineRepository } from './virtual-machine.repository';

import type { VirtualMachineEntity } from './virtual-machine.entity';
import type {
  NameTaken,
  NotFound,
  SavedVirtualMachine,
  VirtualMachineChanges,
} from './virtual-machine.repository';
import type {
  AuthUser,
  CreateVirtualMachineDTO,
  UpdateVirtualMachineDTO,
  VirtualMachine,
} from '@vm/shared-types';

@Injectable()
export class VirtualMachinesService {
  private readonly logger = new Logger(VirtualMachinesService.name);

  constructor(private readonly repository: VirtualMachineRepository) {}

  /** Todas las VMs, sin paginar (RF-virtual-machines-01). */
  async list(): Promise<VirtualMachine[]> {
    const vms = await this.repository.findAllNewestFirst();
    return vms.map((vm) => this.toVirtualMachine(vm));
  }

  /** Sin `status`, la VM nace `Apagada` (RF-virtual-machines-03). */
  async create(input: CreateVirtualMachineDTO, actor: AuthUser): Promise<VirtualMachine> {
    const result = await this.repository.insert({
      ...input,
      status: input.status ?? VM_STATUSES.OFF,
      createdById: actor.id,
    });
    const vm = this.savedOrThrow(result);

    this.logger.log(`VM creada: vmId=${vm.id} (userId=${actor.id})`);
    return this.toVirtualMachine(vm);
  }

  /** Cambia solo los campos recibidos (RF-virtual-machines-07). */
  async update(
    id: string,
    input: UpdateVirtualMachineDTO,
    actor: AuthUser,
  ): Promise<VirtualMachine> {
    const changes = this.definedChanges(input);
    const vm = this.savedOrThrow(await this.repository.updateById(id, changes));

    this.logger.log(
      `VM actualizada: vmId=${vm.id}, campos=${Object.keys(changes).join(',')} (userId=${actor.id})`,
    );
    return this.toVirtualMachine(vm);
  }

  /** Borrado definitivo (RF-virtual-machines-09). */
  async remove(id: string, actor: AuthUser): Promise<void> {
    const wasDeleted = await this.repository.deleteById(id);
    if (!wasDeleted) throw new VmNotFoundException();

    this.logger.log(`VM eliminada: vmId=${id} (userId=${actor.id})`);
  }

  private savedOrThrow(result: SavedVirtualMachine | NameTaken | NotFound): VirtualMachineEntity {
    if (result.outcome === 'name-taken') throw new VmNameTakenException();
    if (result.outcome === 'not-found') throw new VmNotFoundException();
    return result.vm;
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
