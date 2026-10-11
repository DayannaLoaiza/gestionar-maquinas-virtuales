import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

import { RealtimeIoAdapter } from './modules/realtime/realtime-io.adapter';
import {
  InvalidRequestBodyException,
  RequestBodyTooLargeException,
} from './shared/exceptions/request-body.exceptions';
import { createSecurityHeaders } from './shared/utils/security-headers.util';

import type { Env } from './config/env.validation';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/** El mismo límite que el parser por defecto de Nest: sobra para cualquier cuerpo de esta API. */
const JSON_BODY_LIMIT = '100kb';

/**
 * Opciones de creación de la app. `bodyParser: false` porque el parser lo registra
 * `configureHttpApp`, después de helmet. Las usan `main.ts` y el harness de e2e.
 */
export const HTTP_APP_OPTIONS = { bodyParser: false } as const;

/**
 * Middleware de proceso HTTP, registrado **antes** de `app.init()` para que corra antes que todo:
 * Nest registra su body-parser en `init()` antes que el middleware de los módulos, así que un
 * error del parser saltaba helmet (RF-auth-10, RF-auth-16). La llaman `main.ts` y el harness de
 * e2e: el test prueba exactamente lo que corre en producción.
 */
export function configureHttpApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

  // IP real del cliente solo desde un proxy de confianza (RF-auth-04).
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));

  app.use(createSecurityHeaders(isProduction));
  app.use(cookieParser());
  // Solo JSON: sin parser `urlencoded`, un formulario HTML no puede mandarle datos a la API.
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(translateBodyParserError);
  // Socket.io atiende `/api/socket.io` antes que Express: su borde HTTP (origen, CORS, helmet,
  // cookies) lo arma este adapter, también antes de `init()`, que es cuando nacen los gateways.
  app.useWebSocketAdapter(new RealtimeIoAdapter(app));
}

/**
 * Middleware de error de Express (4 argumentos: solo corre si el parser falló). Sin esto, Nest
 * convierte el error de JSON en un 400 que repite la entrada y el de tamaño en un 500 (RF-auth-16).
 */
function translateBodyParserError(
  error: unknown,
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  next(
    isPayloadTooLarge(error)
      ? new RequestBodyTooLargeException()
      : new InvalidRequestBodyException(),
  );
}

function isPayloadTooLarge(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  return error.status === HttpStatus.PAYLOAD_TOO_LARGE;
}
