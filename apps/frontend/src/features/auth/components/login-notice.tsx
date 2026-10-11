import { InfoCircle } from '@/components/svg/info-circle';
import { LOGIN_NOTICES } from '@/config/auth';

import type { LoginNotice as LoginNoticeKey } from '@/config/auth';

/**
 * Aviso de `/login` tras un `401` o un cierre de sesión (RF-auth-26, 29). El texto es fijo: la URL
 * solo elige la clave.
 */
export function LoginNotice({ notice }: { notice: LoginNoticeKey }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-200"
    >
      <InfoCircle className="mt-0.5 size-4 shrink-0" />
      <p>{LOGIN_NOTICES[notice]}</p>
    </div>
  );
}
