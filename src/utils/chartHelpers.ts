import { ChartType } from '../types/chart';

/**
 * Returns true for chart types that use a single dataset where each label
 * (slice) gets its own color — i.e. pie, doughnut, and polarArea.
 *
 * Series charts (bar, line, scatter, area) use one color per *dataset*, not
 * per label, so they return false.
 */
export function isProportionChart(type: ChartType): boolean {
  return type === 'pie' || type === 'doughnut' || type === 'polarArea';
}
