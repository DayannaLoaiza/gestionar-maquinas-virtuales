'use client';

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import { formatShare } from '@/lib/format';
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion';
import { RESOURCES } from '@/lib/resource-dashboard/resource-summary';

import { ChartDataTable } from './chart-data-table';
import {
  ACTIVE_FILL,
  AXIS_TICK,
  ChartCaption,
  ChartTooltipBox,
  GRID_STROKE,
  INACTIVE_FILL,
  SEGMENT_GAP,
  SeriesKey,
} from './chart-parts';
import { RESOURCE_LABELS, RESOURCE_TEXT } from '../resource-labels';

import type { Resource, ResourceSummary } from '@/lib/resource-dashboard/resource-summary';

interface ShareRow {
  resource: Resource;
  label: string;
  active: number;
  inactive: number;
}

function shareRows(summary: ResourceSummary): ShareRow[] {
  return RESOURCES.map((resource) => ({
    resource,
    label: RESOURCE_LABELS[resource].label,
    active: summary.active[resource],
    inactive: summary.allocated[resource] - summary.active[resource],
  }));
}

/** "24 cores (75 %)": el valor absoluto con su unidad y su parte del total. */
function describeShare(row: ShareRow, value: number): string {
  const total = row.active + row.inactive;
  return `${RESOURCE_LABELS[row.resource].format(value)} (${formatShare(value, total)})`;
}

function ShareTooltip({ row }: Readonly<{ row: ShareRow | undefined }>) {
  if (row === undefined) return null;
  return (
    <ChartTooltipBox title={row.label}>
      <SeriesKey
        color={ACTIVE_FILL}
      >{`${RESOURCE_TEXT.active}: ${describeShare(row, row.active)}`}</SeriesKey>
      <SeriesKey
        color={INACTIVE_FILL}
      >{`${RESOURCE_TEXT.inactive}: ${describeShare(row, row.inactive)}`}</SeriesKey>
    </ChartTooltipBox>
  );
}

const PERCENT_TICKS = [0, 0.25, 0.5, 0.75, 1];

/**
 * Barras horizontales apiladas al 100 %, una por recurso (RF-resource-dashboard-04): qué parte de lo
 * asignado está en VMs encendidas. Los tres recursos tienen unidades distintas: el porcentaje los
 * pone en un solo eje. Énfasis: el acento para las encendidas y gris para las apagadas.
 */
export function ShareChart({ summary }: Readonly<{ summary: ResourceSummary }>) {
  const rows = shareRows(summary);
  const isMotionReduced = usePrefersReducedMotion();

  return (
    <figure className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground">
      <ChartCaption title={RESOURCE_TEXT.shareTitle} description={RESOURCE_TEXT.shareDescription} />
      <BarChart
        layout="vertical"
        data={rows}
        stackOffset="expand"
        responsive
        style={{ width: '100%', height: 168 }}
        margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        title={RESOURCE_TEXT.shareTitle}
        desc={RESOURCE_TEXT.shareDescription}
      >
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
        <XAxis
          type="number"
          ticks={PERCENT_TICKS}
          tickFormatter={(value: number) => formatShare(value, 1)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={64}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)' }}
          content={({ label }) => <ShareTooltip row={rows.find((row) => row.label === label)} />}
        />
        <Bar
          dataKey="active"
          name={RESOURCE_TEXT.active}
          stackId="share"
          fill={ACTIVE_FILL}
          {...SEGMENT_GAP}
          isAnimationActive={!isMotionReduced}
        />
        <Bar
          dataKey="inactive"
          name={RESOURCE_TEXT.inactive}
          stackId="share"
          fill={INACTIVE_FILL}
          {...SEGMENT_GAP}
          radius={[0, 4, 4, 0]}
          isAnimationActive={!isMotionReduced}
        />
      </BarChart>
      <div className="flex flex-wrap gap-6 text-sm">
        <SeriesKey color={ACTIVE_FILL}>{RESOURCE_TEXT.active}</SeriesKey>
        <SeriesKey color={INACTIVE_FILL}>{RESOURCE_TEXT.inactive}</SeriesKey>
      </div>
      <ChartDataTable
        caption={RESOURCE_TEXT.shareTitle}
        headers={['Recurso', RESOURCE_TEXT.active, RESOURCE_TEXT.inactive]}
        rows={rows.map((row) => [
          row.label,
          describeShare(row, row.active),
          describeShare(row, row.inactive),
        ])}
      />
    </figure>
  );
}
