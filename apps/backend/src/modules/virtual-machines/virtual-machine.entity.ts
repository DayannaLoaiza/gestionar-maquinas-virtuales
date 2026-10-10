import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  VM_LIMITS,
  VM_NAME_PATTERN,
  VM_OPERATING_SYSTEM_VALUES,
  VM_STATUS_VALUES,
  VM_STATUSES,
} from '@vm/shared-types';

import { UserEntity } from '@/modules/users/user.entity';

import type { VmOperatingSystem, VmStatus } from '@vm/shared-types';

const { cores, ram, disk } = VM_LIMITS;

/**
 * Fila de `virtual_machines`. Nunca sale de la API: el service la mapea a `VirtualMachine`, sin el
 * creador. Las reglas de RF-virtual-machines-05 se repiten en la base (RNF-virtual-machines-01).
 *
 * El nombre es único sin distinguir mayúsculas con un índice sobre `lower("name")`, escrito en la
 * migración: TypeORM no sincroniza índices por expresión, y `synchronize: false` evita que un
 * `migration:generate` lo borre.
 */
@Entity({ name: 'virtual_machines' })
@Index('UQ_virtual_machines_name_lower', { synchronize: false })
@Check('CHK_virtual_machines_name', `"name" ~ '${VM_NAME_PATTERN.source}'`)
@Check(
  'CHK_virtual_machines_cores',
  `"cores" BETWEEN ${String(cores.min)} AND ${String(cores.max)}`,
)
@Check('CHK_virtual_machines_ram', `"ram" BETWEEN ${String(ram.min)} AND ${String(ram.max)}`)
@Check('CHK_virtual_machines_disk', `"disk" BETWEEN ${String(disk.min)} AND ${String(disk.max)}`)
export class VirtualMachineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: VM_LIMITS.name.maxLength })
  name!: string;

  @Column({ type: 'integer' })
  cores!: number;

  /** En GB. */
  @Column({ type: 'integer' })
  ram!: number;

  /** En GB. */
  @Column({ type: 'integer' })
  disk!: number;

  @Column({ type: 'enum', enum: VM_OPERATING_SYSTEM_VALUES, enumName: 'vm_os' })
  os!: VmOperatingSystem;

  @Column({ type: 'enum', enum: VM_STATUS_VALUES, enumName: 'vm_status', default: VM_STATUSES.OFF })
  status!: VmStatus;

  /** Quién la creó, solo para auditoría (RNF-virtual-machines-02). */
  @Index('IDX_virtual_machines_created_by')
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'FK_virtual_machines_created_by' })
  createdBy!: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
