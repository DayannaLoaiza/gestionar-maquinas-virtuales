import { describe, expect, it } from 'vitest';

import { ApiError, toUserMessage } from './api-error';

const FALLBACK = 'No se pudo completar la acción';

describe('toUserMessage', () => {
  it('muestra el mensaje de un 4xx del backend', () => {
    const error = new ApiError('Ya existe un recurso con ese nombre', 409, 'CONFLICT');

    expect(toUserMessage(error, FALLBACK)).toBe('Ya existe un recurso con ese nombre');
  });

  it.each([500, 502, 503, 429])('usa el fallback ante un status %i', (status) => {
    expect(toUserMessage(new ApiError('detalle técnico', status), FALLBACK)).toBe(FALLBACK);
  });

  it.each(['VALIDATION_ERROR', 'INTERNAL_ERROR'])('usa el fallback ante el code %s', (code) => {
    expect(toUserMessage(new ApiError('Validation failed', 400, code), FALLBACK)).toBe(FALLBACK);
  });

  it.each([new Error('Failed to fetch'), new TypeError('x is undefined'), 'texto', null])(
    'usa el fallback ante algo que no es un ApiError (%p)',
    (error) => {
      expect(toUserMessage(error, FALLBACK)).toBe(FALLBACK);
    },
  );
});
