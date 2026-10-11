'use client';

import { VM_OPERATING_SYSTEM_VALUES, VM_STATUS_VALUES } from '@vm/shared-types';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';

import type { VmFormValues } from '@/schemas/vm-form';
import type { ComponentProps } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

/** Los atributos que asocian un campo con su mensaje de error (RF-virtual-machines-16). */
function errorProps(id: string, message: string | undefined) {
  if (message === undefined) return {};
  return { 'aria-invalid': true, 'aria-describedby': `${id}-error` } as const;
}

export function FieldError({ id, message }: Readonly<{ id: string; message: string | undefined }>) {
  if (message === undefined) return null;
  return (
    <p id={`${id}-error`} className="text-sm text-error-700 dark:text-error-500">
      {message}
    </p>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  error: string | undefined;
  inputProps: ComponentProps<typeof Input>;
}

/** Un campo de texto con su etiqueta visible y su error asociado. */
export function TextField({ id, label, error, inputProps }: Readonly<TextFieldProps>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...errorProps(id, error)} {...inputProps} />
      <FieldError id={id} message={error} />
    </div>
  );
}

/**
 * Un número escrito como texto, con teclado numérico en móvil (`inputMode`): con
 * `type="number"`, `2,5` llegaría vacío y no se podría decir qué está mal (RF-virtual-machines-17).
 */
export function NumberField(props: Readonly<TextFieldProps>) {
  return (
    <TextField
      {...props}
      inputProps={{ type: 'text', inputMode: 'numeric', autoComplete: 'off', ...props.inputProps }}
    />
  );
}

interface FieldsProps {
  idPrefix: string;
  register: UseFormRegister<VmFormValues>;
  errors: FieldErrors<VmFormValues>;
}

/** El sistema operativo: `<select>` nativo con el catálogo cerrado de la API. */
export function OsField({ idPrefix, register, errors }: Readonly<FieldsProps>) {
  const id = `${idPrefix}-os`;
  const error = errors.os?.message;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Sistema operativo</Label>
      <NativeSelect id={id} {...errorProps(id, error)} {...register('os')}>
        <option value="">Elige un sistema operativo</option>
        {VM_OPERATING_SYSTEM_VALUES.map((os) => (
          <option key={os} value={os}>
            {os}
          </option>
        ))}
      </NativeSelect>
      <FieldError id={id} message={error} />
    </div>
  );
}

/** El estado: dos radios nativos en un `fieldset`, todas las opciones a la vista. */
export function StatusField({
  idPrefix,
  register,
  legend,
}: Readonly<Omit<FieldsProps, 'errors'> & { legend: string }>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-6">
        {VM_STATUS_VALUES.map((status) => (
          <label
            key={status}
            htmlFor={`${idPrefix}-status-${status}`}
            className="flex items-center gap-2 text-sm"
          >
            <input
              id={`${idPrefix}-status-${status}`}
              type="radio"
              value={status}
              className="size-4 accent-primary-500 dark:accent-primary-400"
              {...register('status')}
            />
            {status}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
