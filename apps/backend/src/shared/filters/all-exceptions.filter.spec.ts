import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { z } from 'zod';

import { AllExceptionsFilter } from './all-exceptions.filter';

import type { ArgumentsHost } from '@nestjs/common';

/**
 * Este filtro decide qué información sale del servidor, y el frontend muestra el `message` de un
 * 4xx tal cual al usuario. Se verifican las dos mitades.
 */
describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const body = (): Record<string, unknown> => {
    const firstCall = json.mock.calls[0] as [Record<string, unknown>] | undefined;
    return firstCall?.[0] ?? {};
  };
  const error = (): Record<string, unknown> => body().error as Record<string, unknown>;

  describe('errores de Zod', () => {
    const zodError = (): z.ZodError => {
      const result = z.object({ name: z.string() }).safeParse({});
      if (result.success) throw new Error('se esperaba una falla de validación');
      return result.error;
    };

    it('responde 400 con un código y sin detalles del schema', () => {
      filter.catch(zodError(), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(body()).toEqual({
        success: false,
        error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
      });
    });

    it('deja los issues en el log', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');

      filter.catch(zodError(), host);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
    });
  });

  describe('excepciones HTTP 4xx', () => {
    it('pasa el mensaje para el usuario sin tocarlo', () => {
      filter.catch(new ConflictException('Ya existe un recurso con ese nombre'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(error()).toEqual({ message: 'Ya existe un recurso con ese nombre', code: 'CONFLICT' });
    });

    it('respeta el code que declaró la excepción', () => {
      filter.catch(
        new BadRequestException({ message: 'Identificador inválido', code: 'INVALID_ID' }),
        host,
      );

      expect(error()).toEqual({ message: 'Identificador inválido', code: 'INVALID_ID' });
    });

    it('toma el primer mensaje del arreglo que arma Nest por defecto', () => {
      filter.catch(new BadRequestException(['primer problema', 'segundo problema']), host);

      expect(error().message).toBe('primer problema');
    });
  });

  describe('5xx', () => {
    it('nunca ecoa el mensaje de una HttpException 5xx', () => {
      filter.catch(new BadGatewayException('Proveedor externo: 502'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      expect(error()).toEqual({ message: 'Internal server error', code: 'INTERNAL_ERROR' });
      expect(JSON.stringify(body())).not.toContain('Proveedor');
    });

    it('registra en el log lo que no envió', () => {
      const logged = jest.spyOn(Logger.prototype, 'error');

      filter.catch(new BadGatewayException('Proveedor externo: 502'), host);

      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining('Proveedor externo: 502'),
        expect.anything(),
      );
    });

    it('responde un Error común con el cuerpo genérico', () => {
      filter.catch(new Error('connect ECONNREFUSED 10.0.0.4:5432'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error()).toEqual({ message: 'Internal server error', code: 'INTERNAL_ERROR' });
    });

    it('responde algo que no es un Error con el cuerpo genérico', () => {
      filter.catch('algo raro', host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error().code).toBe('INTERNAL_ERROR');
    });

    it('mantiene un 503 con su propio status', () => {
      filter.catch(new HttpException('base caída', HttpStatus.SERVICE_UNAVAILABLE), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(error().message).toBe('Internal server error');
    });
  });
});
