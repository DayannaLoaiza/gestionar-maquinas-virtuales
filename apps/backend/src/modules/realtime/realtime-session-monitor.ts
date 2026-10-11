import { Injectable, Logger } from '@nestjs/common';

import { AuthService } from '@/modules/auth/auth.service';

import { SESSION_REVALIDATION_INTERVAL_MS } from './realtime.constants';
import { RealtimeGateway } from './realtime.gateway';

import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

/**
 * Cierra las conexiones cuya sesión terminó sin logout: venció (RF-auth-05) o el usuario se
 * desactivó. Revisa cada 30 s: la spec admite hasta 60 s, y la mitad deja margen para la duración
 * de la ronda (RF-realtime-vm-status-08). Una sola consulta por ronda, sea cual sea el número de
 * conexiones (RNF-realtime-vm-status-01).
 */
@Injectable()
export class RealtimeSessionMonitor implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeSessionMonitor.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly authService: AuthService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      void this.revalidateOpenSessions();
    }, SESSION_REVALIDATION_INTERVAL_MS);
    // El intervalo no mantiene vivo el proceso: el apagado no lo espera.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Una ronda. Nunca lanza: un error (p. ej., la base caída) queda en el log y se reintenta. */
  async revalidateOpenSessions(): Promise<void> {
    try {
      const openSessions = await this.gateway.openSessions();
      const endedIds = new Set(
        await this.authService.findEndedSessionIds([...openSessions.keys()], new Date()),
      );
      const ended = [...openSessions].filter(([sessionId]) => endedIds.has(sessionId));
      await Promise.all(
        ended.map(([sessionId, userId]) =>
          this.gateway.disconnectSession(sessionId, userId, 'sesión terminada'),
        ),
      );
    } catch (error: unknown) {
      this.logger.error(
        'No se pudieron revalidar las sesiones abiertas',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
