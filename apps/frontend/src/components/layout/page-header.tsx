import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** El `h1` de la página. */
  title: string;
  description?: string;
  /** Acciones de la página (p. ej. "Crear máquina virtual"), alineadas a la derecha. */
  actions?: ReactNode;
}

/** Encabezado de una página del panel: título semi-expandido, descripción y acciones. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-balance font-stretch-semi-expanded sm:text-4xl">
          {title}
        </h1>
        {description !== undefined && (
          <p className="max-w-prose text-muted-foreground">{description}</p>
        )}
      </div>
      {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
