import { Catch, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { ApiErrorBody } from '@vm/shared-types';
import type { Response } from 'express';

const FIRST_SERVER_ERROR_STATUS = 500;

const GENERIC_ERROR: ApiErrorBody = {
  success: false,
  error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
};

/**
 * Sobre de error estándar: `{ success: false, error: { message, code } }`.
 *
 * El frontend muestra el `message` de un 4xx tal cual al usuario, así que este filtro es la frontera
 * que decide qué sale del servidor: un 5xx nunca ecoa su mensaje (describe la falla para nosotros y
 * puede nombrar un servicio externo) y un error de validación responde con un código en vez de los
 * reclamos del schema.
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // Los issues describen el schema: quedan en el log y el cliente recibe solo el código.
    if (exception instanceof z.ZodError) {
      this.logger.warn(`Validation failed: ${exception.message}`);
      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
      } satisfies ApiErrorBody);
      return;
    }

    if (exception instanceof HttpException) {
      this.sendHttpException(response, exception);
      return;
    }

    if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unknown exception', exception);
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(GENERIC_ERROR);
  }

  private sendHttpException(response: Response, exception: HttpException): void {
    const status = exception.getStatus();

    if (status >= FIRST_SERVER_ERROR_STATUS) {
      this.logger.error(`${String(status)} — ${exception.message}`, exception.stack);
      response.status(status).json(GENERIC_ERROR);
      return;
    }

    const { message, code } = this.describe(exception);
    response.status(status).json({
      success: false,
      error: { message, code: code ?? HttpStatus[status] ?? 'ERROR' },
    } satisfies ApiErrorBody);
  }

  /**
   * El mensaje y el `code` opcional que declaró la excepción. Respetar el `code` permite que una
   * excepción nueva le diga al frontend "este texto no es para el usuario" sin tocar este filtro.
   */
  private describe(exception: HttpException): { message: string; code?: string } {
    const payload = exception.getResponse();
    if (typeof payload === 'string') return { message: payload };

    const { message, code } = payload as Record<string, unknown>;
    const text: unknown = Array.isArray(message) ? message[0] : message;
    return {
      message: typeof text === 'string' ? text : exception.message,
      ...(typeof code === 'string' ? { code } : {}),
    };
  }
}
