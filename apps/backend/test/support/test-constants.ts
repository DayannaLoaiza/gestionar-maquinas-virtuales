/** Secreto fijo de los e2e: los tests lo usan para fabricar tokens alterados o vencidos. */
export const TEST_JWT_SECRET = 'e2e-only-secret-que-tiene-mas-de-32-bytes';

/** Único origen permitido por CORS en los e2e (RF-auth-11). */
export const TEST_ALLOWED_ORIGIN = 'http://localhost:3000';
