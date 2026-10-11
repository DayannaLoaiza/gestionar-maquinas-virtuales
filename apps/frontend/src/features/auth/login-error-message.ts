import { LOGIN_ERROR_MESSAGES } from '@/config/auth';
import { ApiError } from '@/lib/api/api-error';

const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;

/** El texto del toast de un login fallido, decidido por el status (RF-auth-20). */
export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return LOGIN_ERROR_MESSAGES.unavailable;
  if (error.status === UNAUTHORIZED) return LOGIN_ERROR_MESSAGES.invalidCredentials;
  if (error.status === TOO_MANY_REQUESTS) return LOGIN_ERROR_MESSAGES.tooManyAttempts;
  return LOGIN_ERROR_MESSAGES.unavailable;
}
