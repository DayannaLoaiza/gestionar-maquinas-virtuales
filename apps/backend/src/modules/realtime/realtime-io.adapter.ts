import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';

import { isOriginAllowed } from '@/shared/utils/origin.util';
import { createSecurityHeaders } from '@/shared/utils/security-headers.util';

import type { Env } from '@/config/env.validation';
import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import type { ServerOptions } from 'socket.io';

type AllowRequestCallback = (error: string | null | undefined, isAllowed: boolean) => void;

/**
 * Borde HTTP de Socket.io. Engine.IO atiende `/api/socket.io` antes que Express, así que acá se
 * repite lo de `configureHttpApp`, con lo que depende de la configuración y el decorador del
 * gateway no puede leer:
 * - `allowRequest`: un handshake con un `Origin` fuera de `CORS_ORIGIN` se rechaza antes del
 *   upgrade, aunque traiga una cookie válida (RF-realtime-vm-status-04: WebSocket no está sujeto a
 *   CORS, y sin esto otra página podría abrir un socket con la cookie de la víctima).
 * - `cors` con la misma lista y sin `credentials` (RNF-auth-05).
 * - `helmet` (RF-realtime-vm-status-10) y `cookie-parser`, para leer la cookie de sesión en el
 *   handshake igual que en HTTP.
 */
export class RealtimeIoAdapter extends IoAdapter {
  private readonly edgeLogger = new Logger(RealtimeIoAdapter.name);
  private readonly allowedOrigins: ReadonlySet<string>;
  private readonly isProduction: boolean;

  constructor(app: INestApplication) {
    super(app);
    const config = app.get<ConfigService<Env, true>>(ConfigService);
    this.allowedOrigins = new Set(config.get('CORS_ORIGIN', { infer: true }));
    this.isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  /** `unknown` y no `Server`: el tipo de la base es `any`, y Nest tipa el servidor en el gateway. */
  override createIOServer(port: number, options?: Partial<ServerOptions>): unknown {
    const server: unknown = super.createIOServer(port, {
      ...options,
      cors: { origin: [...this.allowedOrigins], credentials: false },
      allowRequest: (request: IncomingMessage, callback: AllowRequestCallback) => {
        this.allowByOrigin(request, callback);
      },
    });
    if (!(server instanceof Server)) {
      throw new Error('IoAdapter no devolvió un servidor de Socket.io');
    }

    // Engine.IO registra primero el middleware de CORS; estos corren después, en cada petición
    // HTTP del endpoint, también en el upgrade.
    server.engine.use(createSecurityHeaders(this.isProduction));
    server.engine.use(cookieParser());
    return server;
  }

  private allowByOrigin(request: IncomingMessage, callback: AllowRequestCallback): void {
    if (isOriginAllowed(request.headers.origin, this.allowedOrigins)) {
      callback(null, true);
      return;
    }
    this.edgeLogger.warn(
      `Socket rechazado: origen no permitido (ip=${request.socket.remoteAddress ?? '-'})`,
    );
    callback('Origen no permitido', false);
  }
}
