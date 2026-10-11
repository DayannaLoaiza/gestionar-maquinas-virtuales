'use client';

import { Bar, BarChart, LabelList, Rectangle, Tooltip, XAxis, YAxis } from 'recharts';

import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion';
import { rankContributions, RESOURCES } from '@/lib/resource-dashboard/resource-summary';

import { ChartDataTable } from './chart-data-table';
import {
  ACTIVE_FILL,
  AXIS_TICK,
  ChartCaption,
  ChartTooltipBox,
  INACTIVE_FILL,
  SEGMENT_GAP,
  truncateLabel,
} from './chart-parts';
import { RESOURCE_LABELS, RESOURCE_TEXT } from '../resource-labels';

import type { ContributionRow, Resource } from '@/lib/resource-dashboard/resource-summary';
import type { VirtualMachine } from '@vm/shared-types';
import type { BarShapeProps, LabelProps } from 'recharts';

const ROW_HEIGHT = 32;

interface BarRow {
  key: string;
  label: string;
  value: number;
  /** El valor con su unidad, para la etiqueta al final de la barra. */
  valueLabel: string;
  isOthers: boolean;
}

function toBarRow(row: ContributionRow, format: (value: number) => string): BarRow {
  const isOthers = row.kind === 'others';
  return {
    key: row.key,
    label: isOthers ? RESOURCE_TEXT.others(row.count) : row.name,
    value: row.value,
    valueLabel: format(row.value),
    isOthers,
  };
}

/** Cada barra con su color: "Otras" en gris (reemplaza a `Cell`, deprecado en Recharts 3). */
function barShape(rows: readonly BarRow[]) {
  return function ContributionBar(props: BarShapeProps) {
    return (
      <Rectangle
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        radius={[0, 4, 4, 0]}
        fill={rows[props.index]?.isOthers === true ? INACTIVE_FILL : ACTIVE_FILL}
        {...SEGMENT_GAP}
      />
    );
  };
}

/**
 * El valor al final de la barra, en una sola línea: el `LabelList` de Recharts ajusta el texto al
 * ancho de la barra y partía "16 cores" en dos renglones.
 */
function ValueLabel({ viewBox, value }: LabelProps) {
  if (viewBox === undefined || !('width' in viewBox) || value === undefined) return null;
  const { x, y, width, height } = viewBox;
  return (
    <text x={x + width + 6} y={y + height / 2} dominantBaseline="central" style={AXIS_TICK}>
      {value}
    </text>
  );
}

function ContributionTooltip({ row }: Readonly<{ row: BarRow | undefined }>) {
  if (row === undefined) return null;
  return <ChartTooltipBox title={row.label}>{row.valueLabel}</ChartTooltipBox>;
}

function ContributionChart({ resource, rows }: Readonly<{ resource: Resource; rows: BarRow[] }>) {
  const { label } = RESOURCE_LABELS[resource];
  const title = RESOURCE_TEXT.contributionTitle(label);
  const isMotionReduced = usePrefersReducedMotion();

  return (
    <figure className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground">
      <figcaption className="font-semibold">{label}</figcaption>
      <BarChart
        layout="vertical"
        data={rows}
        responsive
        style={{ width: '100%', height: rows.length * ROW_HEIGHT + 8 }}
        margin={{ top: 0, right: 64, bottom: 0, left: 0 }}
        title={title}
        desc={RESOURCE_TEXT.contributionDescription}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={96}
          tick={AXIS_TICK}
          tickFormatter={(text: string) => truncateLabel(text, 12)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)' }}
          content={({ label: rowLabel }) => (
            <ContributionTooltip row={rows.find((row) => row.label === rowLabel)} />
          )}
        />
        <Bar
          dataKey="value"
          name={label}
          shape={barShape(rows)}
          isAnimationActive={!isMotionReduced}
        >
          <LabelList dataKey="valueLabel" content={ValueLabel} />
        </Bar>
      </BarChart>
      <ChartDataTable
        caption={title}
        headers={['Máquina virtual', label]}
        rows={rows.map((row) => [row.label, row.valueLabel])}
      />
    </figure>
  );
}

/**
 * El aporte de cada VM encendida, un gráfico chico por recurso (RF-resource-dashboard-05): un solo
 * color, porque lo que identifica a la VM es su nombre; "Otras" en gris. Sin VMs encendidas, el texto
 * que lo dice en lugar de gráficos vacíos (RF-resource-dashboard-07).
 */
export function ContributionCharts({ vms }: Readonly<{ vms: readonly VirtualMachine[] }>) {
  const byResource = RESOURCES.map((resource) => ({
    resource,
    rows: rankContributions(vms, resource).map((row) =>
      toBarRow(row, RESOURCE_LABELS[resource].format),
    ),
  }));
  if (byResource.every(({ rows }) => rows.length === 0)) {
    return <p className="text-sm text-muted-foreground">{RESOURCE_TEXT.noneActive}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ChartCaption
        as="div"
        title={RESOURCE_TEXT.contributionHeading}
        description={RESOURCE_TEXT.contributionDescription}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {byResource.map(({ resource, rows }) => (
          <ContributionChart key={resource} resource={resource} rows={rows} />
        ))}
      </div>
    </div>
  );
}
