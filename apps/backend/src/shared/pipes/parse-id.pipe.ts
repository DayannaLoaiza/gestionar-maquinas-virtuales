import { Injectable, ParseUUIDPipe } from '@nestjs/common';

import { InvalidIdException } from '@/shared/exceptions/request-params.exceptions';

/**
 * Valida que un id de la ruta sea un UUID, sin consultar la base. Si no lo es, `400`
 * `VALIDATION_ERROR` (`InvalidIdException`).
 *
 * @example
 * @Put(':id')
 * update(@Param('id', ParseIdPipe) id: string) {}
 */
@Injectable()
export class ParseIdPipe extends ParseUUIDPipe {
  constructor() {
    super({ exceptionFactory: () => new InvalidIdException() });
  }
}
