'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { buildUpdatePayload, createVmFormSchema } from '@/schemas/vm-form';

import { NumberField, OsField, StatusField, TextField } from './vm-form-fields';

import type { VmFormOutput, VmFormSchema, VmFormValues } from '@/schemas/vm-form';
import type { UpdateVirtualMachineDTO } from '@vm/shared-types';

/** Las etiquetas de los campos obligatorios, para decir junto al botón qué falta. */
const REQUIRED_FIELDS = [
  ['name', 'nombre'],
  ['os', 'sistema operativo'],
  ['cores', 'cores'],
  ['ram', 'RAM'],
  ['disk', 'disco'],
] as const satisfies readonly (readonly [keyof VmFormValues, string])[];

type WatchedValues = Partial<Record<keyof VmFormValues, string>>;

/** El texto junto al botón deshabilitado: qué campos faltan o que hay que corregir (RF-16). */
function submitHint(values: WatchedValues): string {
  const missing = REQUIRED_FIELDS.filter(([field]) => (values[field] ?? '').trim() === '').map(
    ([, label]) => label,
  );
  if (missing.length > 0) return `Falta completar: ${missing.join(', ')}.`;
  return 'Corrige los campos marcados.';
}

/** Los cambios respecto de los valores iniciales, si el formulario es válido (RF-20). */
function pendingChanges(
  schema: VmFormSchema,
  values: WatchedValues,
  initial: VmFormOutput | undefined,
): UpdateVirtualMachineDTO | null {
  if (initial === undefined) return null;
  const parsed = schema.safeParse(values);
  return parsed.success ? buildUpdatePayload(initial, parsed.data) : null;
}

export type VmFormProps = Readonly<{
  /** Valores con los que abre: vacío, el borrador de una creación fallida o la VM a editar. */
  defaultValues: VmFormValues;
  /** Los nombres de las demás VMs, para avisar mientras se escribe (RF-virtual-machines-18). */
  otherNames: readonly string[];
  /** Solo en la edición: los valores actuales de la VM, para enviar solo lo que cambió. */
  initialOutput?: VmFormOutput | undefined;
  /** El error del nombre que devolvió la API al reabrir una creación fallida (`409`). */
  nameError?: string | null | undefined;
  submitLabel: string;
  onSubmit: (output: VmFormOutput) => void;
}>;

/**
 * Formulario de crear o editar una VM (RF-virtual-machines-16…20): valida con las reglas de la API
 * mientras se escribe (`mode: 'all'`) y no deja enviar mientras falte algo o haya un error. Al
 * enviar no espera la respuesta: quien lo usa dispara la mutación optimista y cierra el modal.
 */
export function VmForm({
  defaultValues,
  otherNames,
  initialOutput,
  nameError,
  submitLabel,
  onSubmit,
}: VmFormProps) {
  const idPrefix = useId();
  const hintId = `${idPrefix}-hint`;
  const [schema] = useState(() => createVmFormSchema(otherNames));
  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors, isValid },
  } = useForm<VmFormValues, unknown, VmFormOutput>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'all',
  });
  const values = useWatch({ control });

  useEffect(() => {
    if (nameError === undefined || nameError === null) return;
    setError('name', { type: 'server', message: nameError });
    setFocus('name');
  }, [nameError, setError, setFocus]);

  const isEdit = initialOutput !== undefined;
  const hasChanges = !isEdit || pendingChanges(schema, values, initialOutput) !== null;
  const canSubmit = isValid && hasChanges;
  const hint = isValid ? 'Todavía no cambiaste nada.' : submitHint(values);

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <TextField
        id={`${idPrefix}-name`}
        label="Nombre"
        error={errors.name?.message}
        inputProps={{ autoComplete: 'off', spellCheck: false, ...register('name') }}
      />
      <OsField idPrefix={idPrefix} register={register} errors={errors} />
      <div className="grid gap-6 sm:grid-cols-3">
        <NumberField
          id={`${idPrefix}-cores`}
          label="Cores"
          error={errors.cores?.message}
          inputProps={register('cores')}
        />
        <NumberField
          id={`${idPrefix}-ram`}
          label="RAM (GB)"
          error={errors.ram?.message}
          inputProps={register('ram')}
        />
        <NumberField
          id={`${idPrefix}-disk`}
          label="Disco (GB)"
          error={errors.disk?.message}
          inputProps={register('disk')}
        />
      </div>
      <StatusField
        idPrefix={idPrefix}
        register={register}
        legend={isEdit ? 'Estado' : 'Estado inicial'}
      />
      <DialogFooter className="items-center">
        {!canSubmit && (
          <p id={hintId} className="text-sm text-muted-foreground sm:mr-auto">
            {hint}
          </p>
        )}
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={!canSubmit}
          aria-describedby={canSubmit ? undefined : hintId}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
