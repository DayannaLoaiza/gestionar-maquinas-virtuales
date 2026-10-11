import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';

import { RealtimeSessionMonitor } from './realtime-session-monitor';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Tiempo real (`docs/specs/realtime-vm-status/spec.md`). No importa `virtual-machines`: escucha sus
 * eventos internos. El borde HTTP del socket lo arma `RealtimeIoAdapter`, en `configureHttpApp`.
 */
@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimeSessionMonitor],
})
export class RealtimeModule {}
