/**
 * Formato de números de la interfaz, en español (RF-resource-dashboard-08). `es` no agrupa los
 * números de 4 cifras (`2048`, regla de la RAE y de CLDR) y sí desde 5 (`65.536`).
 */
const INTEGER_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });

export function formatInteger(value: number): string {
  return INTEGER_FORMAT.format(value);
}

/** RAM y disco van siempre en GB, sin convertir a TB. */
export function formatGb(value: number): string {
  return `${formatInteger(value)} GB`;
}

const PERCENT_FORMAT = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 0 });

/**
 * `part` como porcentaje entero de `total` (RF-resource-dashboard-08). Una parte que no es cero
 * nunca se muestra como `0 %`: se muestra `< 1 %`.
 */
export function formatShare(part: number, total: number): string {
  if (part === 0 || total === 0) return PERCENT_FORMAT.format(0);
  const ratio = part / total;
  return ratio < 0.005 ? `< ${PERCENT_FORMAT.format(0.01)}` : PERCENT_FORMAT.format(ratio);
}
