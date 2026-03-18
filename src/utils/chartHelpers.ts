import { ChartType } from '../types/chart';

/** Returns true for chart types where each label/slice gets one color (pie, doughnut, polarArea). */
export function isProportionChart(type: ChartType): boolean {
  return type === 'pie' || type === 'doughnut' || type === 'polarArea';
}
