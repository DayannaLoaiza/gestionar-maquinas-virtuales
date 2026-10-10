import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';

/**
 * Envuelve toda respuesta en `{ success: true, data }`.
 *
 * Si el valor ya trae la clave `success` lo deja pasar sin envolver. Los handlers que escriben con
 * `@Res()` (streams de archivos) no pasan por acá.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data !== null && typeof data === 'object' && 'success' in data) return data;
        return { success: true, data };
      }),
    );
  }
}
