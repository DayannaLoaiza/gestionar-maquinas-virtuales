import type { RealtimeClientSocket } from '@/lib/realtime/realtime-socket';

type Listener = (...args: unknown[]) => void;

/**
 * Un socket de Socket.io falso (el borde de red de la conexión de tiempo real): registra los
 * listeners, cuenta las conexiones y permite disparar eventos del servidor.
 */
export class FakeSocket {
  active = false;
  connectCalls = 0;
  readonly emitted: unknown[][] = [];
  private readonly listeners = new Map<string, Listener[]>();

  on(event: string, listener: Listener): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }

  connect(): this {
    this.connectCalls += 1;
    return this;
  }

  disconnect(): this {
    this.trigger('disconnect', 'io client disconnect');
    return this;
  }

  emit(...args: unknown[]): this {
    this.emitted.push(args);
    return this;
  }

  trigger(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }

  /** Un rechazo del middleware del handshake: Socket.io no reintenta solo. */
  rejectHandshake(data?: { code: string; message: string }): void {
    this.active = false;
    this.trigger('connect_error', Object.assign(new Error(data?.message ?? 'rechazada'), { data }));
  }

  asSocket(): RealtimeClientSocket {
    return this as unknown as RealtimeClientSocket;
  }
}
