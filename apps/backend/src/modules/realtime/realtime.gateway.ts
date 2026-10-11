import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { REALTIME_EVENTS } from '@vm/shared-types';

import { AUTH_EVENTS } from '@/modules/auth/auth.events';
import { AuthService } from '@/modules/auth/auth.service';
import { SessionCookieService } from '@/modules/auth/session-cookie.service';
import { VM_EVENTS } from '@/modules/virtual-machines/virtual-machine.events';

import { createHandshakeAuth } from './handshake-auth.middleware';
import { REALTIME_GATEWAY_OPTIONS, sessionRoom, VMS_ROOM } from './realtime.constants';

import type { RealtimeServer, RealtimeSocket } from './realtime.types';
import type { SessionRevokedEvent } from '@/modules/auth/auth.events';
import type { OnGatewayConnection, OnGatewayInit } from '@nestjs/websockets';
import type { VmStatusChangedEvent } from '@vm/shared-types';

/**
 * Servidor de tiempo real (`docs/specs/realtime-vm-status/spec.md`): Socket.io en
 * `/api/socket.io`, en el mismo puerto que la API. Es el borde, como un controller: autentica,
 * agrupa en salas y difunde. No tiene reglas de negocio.
 *
 * Recorrido de un cambio de estado:
 * 1. `PUT /api/vms/:id` → `VirtualMachinesService.update` guarda y, si el estado cambió, emite el
 *    evento interno `vm.status-changed` (EventEmitter2).
 * 2. `onVmStatusChanged` lo recibe después de que el `PUT` respondió (`async: true`) y emite
 *    `vm:status-changed` una vez a la sala `vms`, donde están todas las conexiones autenticadas.
 *
 * Fin de sesión: el logout emite `auth.session-revoked` y se cierran las conexiones de la sala
 * `session:<id>`. Las que vencen las cierra `RealtimeSessionMonitor`.
 *
 * Canal de solo bajada: sin `@SubscribeMessage`, un evento del cliente no tiene handler y Socket.io
 * lo descarta (RF-realtime-vm-status-09).
 */
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class RealtimeGateway
  implements OnGatewayInit<RealtimeServer>, OnGatewayConnection<RealtimeSocket>
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: RealtimeServer;

  constructor(
    private readonly authService: AuthService,
    private readonly sessionCookie: SessionCookieService,
  ) {}

  afterInit(server: RealtimeServer): void {
    server.use(
      createHandshakeAuth({
        authService: this.authService,
        sessionCookie: this.sessionCookie,
        logger: this.logger,
      }),
    );
  }

  /** Solo llegan acá las conexiones que pasaron el handshake (RF-realtime-vm-status-02). */
  handleConnection(socket: RealtimeSocket): void {
    // Con el adapter en memoria, `join` es síncrono: la conexión ya está en sus salas antes del
    // siguiente evento.
    void socket.join([VMS_ROOM, sessionRoom(socket.data.sessionId)]);
    this.logger.debug(`Socket conectado (userId=${socket.data.user.id})`);
  }

  /** Paso 2 del recorrido: una emisión a la sala de todas las conexiones (RF-realtime-vm-status-05). */
  @OnEvent(VM_EVENTS.STATUS_CHANGED, { async: true })
  onVmStatusChanged(event: VmStatusChangedEvent): void {
    try {
      this.server.to(VMS_ROOM).emit(REALTIME_EVENTS.VM_STATUS_CHANGED, event);
      this.logger.debug(`Estado difundido: vmId=${event.item.id}, status=${event.item.status}`);
    } catch (error: unknown) {
      // La VM ya se guardó y el PUT ya respondió: el error queda en el log (RF-realtime-vm-status-07).
      this.logger.error(
        `No se pudo difundir el cambio de estado: vmId=${event.item.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * El logout cierra al instante las conexiones de esa sesión (RF-realtime-vm-status-08). Un error
   * acá queda en el log: el logout ya revocó la sesión y su respuesta no cambia.
   */
  @OnEvent(AUTH_EVENTS.SESSION_REVOKED)
  async onSessionRevoked({ sessionId, userId }: SessionRevokedEvent): Promise<void> {
    try {
      await this.disconnectSession(sessionId, userId, 'logout');
    } catch (error: unknown) {
      this.logger.error(
        `No se pudieron cerrar las conexiones tras el logout (userId=${userId})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /** Sesiones con conexiones abiertas en esta instancia, cada una con su usuario. */
  async openSessions(): Promise<Map<string, string>> {
    const sockets = await this.server.in(VMS_ROOM).fetchSockets();
    return new Map(sockets.map((socket) => [socket.data.sessionId, socket.data.user.id]));
  }

  /**
   * Cierra todas las conexiones de una sesión. La desconexión la decide el servidor, así que el
   * cliente no reintenta solo (RF-realtime-vm-status-08). Solo deja la línea de log si había
   * conexiones: un logout sin sockets no es una desconexión forzada (RNF-realtime-vm-status-03).
   */
  async disconnectSession(sessionId: string, userId: string, reason: string): Promise<void> {
    const room = this.server.in(sessionRoom(sessionId));
    const sockets = await room.fetchSockets();
    if (sockets.length === 0) return;

    room.disconnectSockets(true);
    this.logger.warn(
      `Conexiones cerradas: ${reason}, ${String(sockets.length)} (userId=${userId})`,
    );
  }
}
