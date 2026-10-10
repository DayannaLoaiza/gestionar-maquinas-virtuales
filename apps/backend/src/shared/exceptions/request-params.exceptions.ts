import { BadRequestException } from '@nestjs/common';

/**
 * Id de la ruta sin formato UUID. Sale como `VALIDATION_ERROR`, igual que un cuerpo inválido: el
 * texto de `ParseUUIDPipe` (`Validation failed (uuid is expected)`) no está escrito para el usuario
 * y el frontend muestra un 4xx tal cual.
 */
export class InvalidIdException extends BadRequestException {
  constructor() {
    super({ message: 'Validation failed', code: 'VALIDATION_ERROR' });
  }
}
