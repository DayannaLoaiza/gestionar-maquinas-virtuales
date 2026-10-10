import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VirtualMachineEntity } from './virtual-machine.entity';
import { VirtualMachineRepository } from './virtual-machine.repository';
import { VirtualMachinesController } from './virtual-machines.controller';
import { VirtualMachinesService } from './virtual-machines.service';

@Module({
  imports: [TypeOrmModule.forFeature([VirtualMachineEntity])],
  controllers: [VirtualMachinesController],
  providers: [VirtualMachineRepository, VirtualMachinesService],
})
export class VirtualMachinesModule {}
