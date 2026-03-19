export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'area' | 'radar' | 'polarArea' | 'combo';

import type { PaletteId } from '../data/palettes';
export type { PaletteId };

export type FontFamily = 'Mona Sans' | 'Mona Sans Display' | 'Mona Sans Mono' | 'Inter' | 'Roboto' | 'Montserrat' | 'Lato' | 'Georgia';

export type PointStyle = 'circle' | 'cross' | 'crossRot' | 'dash' | 'line' | 'rect' | 'rectRounded' | 'rectRot' | 'star' | 'triangle';

export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

export type DataLabelFormat = 'value' | 'percentage' | 'valueAndPercentage';
export type DataLabelPosition = 'auto' | 'start' | 'center' | 'end';

export type NumberFormatType = 'raw' | 'currency' | 'percent' | 'abbreviated' | 'custom';

export interface NumberFormatConfig {
  type: NumberFormatType;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  decimalPlaces: number;
  thousandsSeparator: boolean;
  prefix: string;
  suffix: string;
}

export interface DatasetConfig {
  label: string;
  backgroundColor: string | string[];
  borderColor: string | string[];
  borderWidth: number;
  useGradient?: boolean;
  gradientStartColor?: string;
  gradientEndColor?: string;
}

export interface FontConfig {
  family: FontFamily;
  size: number;
  weight: 'normal' | 'bold';
  color: string;
}

export type BarShape = 'rectangle' | 'rounded-pill' | 'chevron' | 'hexagon' | 'diamond' | 'triangle';

export interface BarConfig {
  borderRadius: number;
  barThickness: number | 'flex';
  grouped: boolean;
  horizontal: boolean;
  shape: BarShape;
}

export interface RadarConfig {
  fill: boolean;
  tension: number;
  pointRadius: number;
}

export interface ComboConfig {
  /** Index of the dataset to render as a line (0-based). -1 means last dataset. */
  lineDatasetIndex: number;
  /** Line tension for the combo line */
  lineTension: number;
  /** Point radius for combo line points */
  linePointRadius: number;
  /** Whether to fill the area under the combo line */
  lineFill: boolean;
}

export interface LineConfig {
  tension: number;
  pointStyle: PointStyle;
  pointRadius: number;
  fill: boolean;
}

export interface ChartCustomization {
  title: string;
  titleFont: FontConfig;
  axisLabelFont: FontConfig;
  tickLabelFont: FontConfig;
  legendFont: FontConfig;
  showLegend: boolean;
  legendPosition: LegendPosition;
  showGridlines: boolean;
  showAxisLabels: boolean;
  xAxisLabel: string;
  yAxisLabel: string;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  aspectRatio: number;
  animationEnabled: boolean;
  barConfig: BarConfig;
  lineConfig: LineConfig;
  radarConfig: RadarConfig;
  comboConfig: ComboConfig;
  datasetConfigs: DatasetConfig[];
  sliceColors: string[];
  selectedPalette?: PaletteId;
  showDataLabels: boolean;
  dataLabelFont: FontConfig;
  dataLabelFormat: DataLabelFormat;
  dataLabelDecimalPlaces: number;
  dataLabelPosition: DataLabelPosition;
  numberFormat: NumberFormatConfig;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
  }[];
}

export interface AppState {
  chartType: ChartType;
  chartData: ChartData;
  customization: ChartCustomization;
  isDarkMode: boolean;
}

export interface SavedChart {
  id: string;
  name: string;
  version: number;
  savedAt: string;
  state: AppState;
}
