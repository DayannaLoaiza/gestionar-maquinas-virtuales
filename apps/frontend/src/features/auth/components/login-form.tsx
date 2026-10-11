'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useId, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';

import { LoginDTO } from '@vm/shared-types';

import { useAuthStore } from '@/components/auth/use-auth-store';
import { Loader2 } from '@/components/svg/loader-2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify } from '@/components/ui/toast';

import { loginErrorMessage } from '../login-error-message';

const subscribeToNothing = () => (): void => undefined;

/** `false` en el HTML del servidor y hasta hidratar; `true` después. */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p id={id} className="text-sm text-error-700 dark:text-error-500">
      {message}
    </p>
  );
}

/**
 * Formulario de login (RF-auth-17–20, 32). Valida con `LoginDTO`, las mismas reglas que la API. Las
 * credenciales solo salen por `POST /api/auth/login`: el formulario es `method="post"` y el botón
 * está deshabilitado hasta hidratar, así que antes de que cargue el JavaScript no hay envío nativo
 * que las ponga en la URL (RF-auth-32).
 */
export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isHydrated = useIsHydrated();
  const emailId = useId();
  const passwordId = useId();
  const {
    register,
    handleSubmit,
    resetField,
    setError,
    setFocus,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm({
    resolver: zodResolver(LoginDTO),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (credentials: LoginDTO): Promise<void> => {
    try {
      await login(credentials);
      router.replace('/');
    } catch (error: unknown) {
      const message = loginErrorMessage(error);
      notify.error(message);
      // El aviso es el toast (un solo canal); el error de `root` evita que el envío cuente como
      // exitoso y deje el botón deshabilitado.
      setError('root.server', { type: 'server', message });
      resetField('password');
      setFocus('password');
    }
  };

  const isBusy = isSubmitting || isSubmitSuccessful;
  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>Correo</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={errors.email === undefined ? undefined : true}
          aria-describedby={errors.email === undefined ? undefined : `${emailId}-error`}
          {...register('email')}
        />
        <FieldError id={`${emailId}-error`} message={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>Contraseña</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password === undefined ? undefined : true}
          aria-describedby={errors.password === undefined ? undefined : `${passwordId}-error`}
          {...register('password')}
        />
        <FieldError id={`${passwordId}-error`} message={errors.password?.message} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={!isHydrated || isBusy}>
        {isBusy && <Loader2 className="animate-spin" />}
        Iniciar sesión
      </Button>
    </form>
  );
}
