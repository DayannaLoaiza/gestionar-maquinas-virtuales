import type { ReactNode } from 'react';

/** Ejes y grilla recesivos: texto de los tokens, nunca el color de una serie. */
export const AXIS_TICK = { fill: 'var(--color-muted-foreground)', fontSize: 12 } as const;
export const GRID_STROKE = 'var(--color-border)';
/** 2 px del color de la tarjeta entre segmentos y barras vecinas, en vez de un borde. */
export const SEGMENT_GAP = { stroke: 'var(--color-card)', strokeWidth: 2 } as const;
export const ACTIVE_FILL = 'var(--color-chart-active)';
export const INACTIVE_FILL = 'var(--color-chart-inactive)';

/** El recuadro del tooltip, con los tokens de tarjeta. */
export function ChartTooltipBox({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="flex max-w-64 flex-col gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-md">
      <p className="font-medium break-words">{title}</p>
      {children}
    </div>
  );
}

/** Una fila del tooltip o de la leyenda: muestra del color y texto. La identidad la da el texto. */
export function SeriesKey({ color, children }: Readonly<{ color: string; children: ReactNode }>) {
  return (
    <span className="flex items-center gap-2 text-muted-foreground">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-card-foreground">{children}</span>
    </span>
  );
}

/**
 * Título y descripción visibles: de un gráfico, como su `figcaption`, o de un grupo de gráficos
 * (`as="div"`).
 */
export function ChartCaption({
  title,
  description,
  as: Wrapper = 'figcaption',
}: Readonly<{ title: string; description: string; as?: 'figcaption' | 'div' }>) {
  return (
    <Wrapper className="flex flex-col gap-1">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Wrapper>
  );
}

/** Corta un nombre largo para el eje; el tooltip lo muestra completo (RF-resource-dashboard-09). */
export function truncateLabel(text: string, maxLength = 14): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
