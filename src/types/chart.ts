export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'area';

import type { PaletteId } from '../data/palettes';
export type { PaletteId };

export type FontFamily = 'Mona Sans' | 'Mona Sans Display' | 'Mona Sans Mono' | 'Inter' | 'Roboto' | 'Montserrat' | 'Lato' | 'Georgia';

export type PointStyle = 'circle' | 'cross' | 'crossRot' | 'dash' | 'line' | 'rect' | 'rectRounded' | 'rectRot' | 'star' | 'triangle';

export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

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

export interface BarConfig {
  borderRadius: number;
  barThickness: number | 'flex';
  grouped: boolean;
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
  datasetConfigs: DatasetConfig[];
  selectedPalette?: PaletteId;
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
