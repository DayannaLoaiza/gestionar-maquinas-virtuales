import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Valida un body con un schema Zod de `@vm/shared-types`.
 *
 * @example
 * @Post()
 * create(@Body(new ZodValidationPipe(CreateThingDTO)) body: CreateThingDTO) {}
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    // Se lanza el ZodError crudo para que AllExceptionsFilter lo trate igual que a cualquier otro:
    // issues al log y `VALIDATION_ERROR` al cliente. Envolverlo en un BadRequestException acá
    // bifurcaría ese camino.
    if (!result.success) throw result.error;

    return result.data;
  }
}
