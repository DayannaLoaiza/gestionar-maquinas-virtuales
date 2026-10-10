import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

/**
 * Cuerpos que no se pudieron leer (RF-auth-16). El mensaje es genérico a propósito: el error del
 * parser repite parte de la entrada (`Unexpected token 'a', "{"email": abc"…`) y un 4xx nunca la
 * devuelve.
 */
export class InvalidRequestBodyException extends BadRequestException {
  constructor() {
    super({ message: 'El cuerpo de la petición no es válido', code: 'INVALID_BODY' });
  }
}

export class RequestBodyTooLargeException extends PayloadTooLargeException {
  constructor() {
    super({ message: 'El cuerpo de la petición es demasiado grande', code: 'PAYLOAD_TOO_LARGE' });
  }
}
