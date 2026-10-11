import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

import type { ComponentType, ReactNode, SVGProps } from 'react';

export interface EmptyStateProps {
  /** Ícono de `@/components/svg/`. */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  /** Qué falta y, si se puede, cómo empezar. */
  description: string;
  /** Botón o enlace que invita a actuar (p. ej. "Crear máquina virtual"). */
  action?: ReactNode;
  /** `h1` si es toda la página; `h2` en una página; `h3` dentro de una sección con su `h2`. */
  titleAs?: 'h1' | 'h2' | 'h3';
  className?: string | undefined;
}

/** Estado vacío listo para usar en un listado sin registros (RF-app-shell-10). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  titleAs = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn('rounded-lg border border-dashed border-border', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle as={titleAs}>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action !== undefined && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
