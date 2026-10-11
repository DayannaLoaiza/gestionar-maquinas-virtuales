import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { VirtualMachineEntity } from './virtual-machine.entity';

import type { VmOperatingSystem, VmStatus } from '@vm/shared-types';

export interface NewVirtualMachineRow {
  name: string;
  cores: number;
  ram: number;
  disk: number;
  os: VmOperatingSystem;
  status: VmStatus;
  createdById: string;
}

/** Campos que se pueden cambiar; los ausentes no se tocan. */
export type VirtualMachineChanges = Partial<
  Pick<VirtualMachineEntity, 'name' | 'cores' | 'ram' | 'disk' | 'os' | 'status'>
>;

/**
 * Resultado de una escritura. El repositorio solo informa qué pasó; el service decide qué
 * excepción corresponde (C7).
 */
export interface SavedVirtualMachine {
  outcome: 'saved';
  vm: VirtualMachineEntity;
}
/** La VM ya actualizada y el estado que tenía justo antes de ese cambio. */
export interface UpdatedVirtualMachine extends SavedVirtualMachine {
  previousStatus: VmStatus;
}
export interface NameTaken {
  outcome: 'name-taken';
}
export interface NotFound {
  outcome: 'not-found';
}

const NAME_TAKEN: NameTaken = { outcome: 'name-taken' };
const NOT_FOUND: NotFound = { outcome: 'not-found' };

/** `unique_violation` de PostgreSQL. */
const UNIQUE_VIOLATION = '23505';
const NAME_UNIQUE_INDEX = 'UQ_virtual_machines_name_lower';

/** Choque con el índice único del nombre: el único error de la base que no es un 500. */
function isNameTakenError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === UNIQUE_VIOLATION &&
    'constraint' in driverError &&
    driverError.constraint === NAME_UNIQUE_INDEX
  );
}

/** Única capa que sabe dónde viven las VMs (C7). */
@Injectable()
export class VirtualMachineRepository {
  constructor(
    @InjectRepository(VirtualMachineEntity) private readonly vms: Repository<VirtualMachineEntity>,
  ) {}

  /** Todas, de la creada más recientemente a la más antigua; el id desempata. */
  findAllNewestFirst(): Promise<VirtualMachineEntity[]> {
    return this.vms.find({ order: { createdAt: 'DESC', id: 'ASC' } });
  }

  /**
   * La unicidad del nombre la decide solo el índice único: dos inserciones simultáneas con el mismo
   * nombre siguen el mismo camino (RF-virtual-machines-06).
   */
  insert(row: NewVirtualMachineRow): Promise<SavedVirtualMachine | NameTaken> {
    return this.catchNameTaken(async () => {
      const vm = await this.vms.save(this.vms.create(row));
      return { outcome: 'saved', vm };
    });
  }

  /**
   * En una transacción: bloquea la fila (`SELECT … FOR UPDATE`), la actualiza y la relee. El bloqueo
   * da el estado anterior real aunque haya escrituras simultáneas (RF-realtime-vm-status-05), y un
   * `DELETE` concurrente o espera o ya la borró: el `UPDATE` nunca la revive. Nunca `save()` con
   * id: si un `DELETE` se adelanta, insertaría la fila de nuevo (RF-virtual-machines-10).
   */
  updateById(
    id: string,
    changes: VirtualMachineChanges,
  ): Promise<UpdatedVirtualMachine | NameTaken | NotFound> {
    return this.catchNameTaken(() =>
      this.vms.manager.transaction(async (manager): Promise<UpdatedVirtualMachine | NotFound> => {
        const vms = manager.getRepository(VirtualMachineEntity);
        const current = await vms.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!current) return NOT_FOUND;

        await vms.update({ id }, changes);
        const vm = await vms.findOneByOrFail({ id });
        return { outcome: 'saved', vm, previousStatus: current.status };
      }),
    );
  }

  /** @returns si había una fila con ese id. */
  async deleteById(id: string): Promise<boolean> {
    const result = await this.vms.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  private async catchNameTaken<T>(write: () => Promise<T>): Promise<T | NameTaken> {
    try {
      return await write();
    } catch (error: unknown) {
      if (isNameTakenError(error)) return NAME_TAKEN;
      throw error;
    }
  }
}
