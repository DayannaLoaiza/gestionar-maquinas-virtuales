import { LOGIN_NOTICE_PARAM, isLoginNotice } from '@/config/auth';
import { LoginForm } from '@/features/auth/components/login-form';
import { LoginNotice } from '@/features/auth/components/login-notice';
import { LoginSessionCheck } from '@/features/auth/components/login-session-check';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
};

/**
 * Login (RF-auth-17–21). Con sesión válida no se llega a ver: `proxy` redirige al Panel, o
 * `LoginSessionCheck` lo hace si el navegador no mandó la cookie. `?aviso=` solo elige uno de los
 * avisos fijos de `LOGIN_NOTICES`.
 */
export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const notice = (await searchParams)[LOGIN_NOTICE_PARAM];

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-balance font-stretch-semi-expanded sm:text-4xl">
          Inicia sesión
        </h1>
        <p className="text-muted-foreground">Accede al panel de tus máquinas virtuales.</p>
      </div>
      {isLoginNotice(notice) && <LoginNotice notice={notice} />}
      <LoginForm />
      <LoginSessionCheck />
    </div>
  );
}
