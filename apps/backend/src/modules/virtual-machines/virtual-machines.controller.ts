import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { CreateVirtualMachineDTO, ROLES, UpdateVirtualMachineDTO } from '@vm/shared-types';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { ParseIdPipe } from '@/shared/pipes/parse-id.pipe';
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe';

import { VirtualMachinesService } from './virtual-machines.service';

import type { AuthUser, VirtualMachine } from '@vm/shared-types';

/**
 * CRUD de VMs (`docs/specs/virtual-machines/spec.md`). Toda ruta exige sesión (guard global); las
 * de escritura, además, rol Administrador. Los guards corren antes que los pipes: un Cliente recibe
 * `403` antes de que se valide el cuerpo o el id (RF-virtual-machines-02).
 */
@Controller('api/vms')
export class VirtualMachinesController {
  constructor(private readonly virtualMachinesService: VirtualMachinesService) {}

  @Get()
  async list(): Promise<{ items: VirtualMachine[] }> {
    return { items: await this.virtualMachinesService.list() };
  }

  @Roles(ROLES.ADMIN)
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateVirtualMachineDTO)) body: CreateVirtualMachineDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<{ item: VirtualMachine }> {
    return { item: await this.virtualMachinesService.create(body, user) };
  }

  @Roles(ROLES.ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseIdPipe) id: string,
    @Body(new ZodValidationPipe(UpdateVirtualMachineDTO)) body: UpdateVirtualMachineDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<{ item: VirtualMachine }> {
    return { item: await this.virtualMachinesService.update(id, body, user) };
  }

  @Roles(ROLES.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIdPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.virtualMachinesService.remove(id, user);
  }
}
