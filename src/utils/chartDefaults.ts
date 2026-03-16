import { ChartCustomization, ChartData, DatasetConfig } from '../types/chart';

export const DEFAULT_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

export const DEFAULT_BORDER_COLORS = [
  '#4f46e5',
  '#d97706',
  '#059669',
  '#dc2626',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#0d9488',
];

export function createDefaultDatasetConfig(index: number, label: string): DatasetConfig {
  return {
    label,
    backgroundColor: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    borderColor: DEFAULT_BORDER_COLORS[index % DEFAULT_BORDER_COLORS.length],
    borderWidth: 2,
    useGradient: false,
    gradientStartColor: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    gradientEndColor: DEFAULT_COLORS[index % DEFAULT_COLORS.length] + '40',
  };
}

export const DEFAULT_CHART_DATA: ChartData = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June'],
  datasets: [
    {
      label: 'Dataset 1',
      data: [65, 59, 80, 81, 56, 72],
    },
    {
      label: 'Dataset 2',
      data: [28, 48, 40, 19, 86, 27],
    },
  ],
};

export const DEFAULT_CUSTOMIZATION: ChartCustomization = {
  title: 'My Chart',
  titleFont: { family: 'Mona Sans', size: 20, weight: 'bold', color: '#1f2937' },
  axisLabelFont: { family: 'Mona Sans', size: 14, weight: 'bold', color: '#374151' },
  tickLabelFont: { family: 'Mona Sans Mono', size: 12, weight: 'normal', color: '#6b7280' },
  legendFont: { family: 'Mona Sans', size: 12, weight: 'normal', color: '#374151' },
  showLegend: true,
  legendPosition: 'top',
  showGridlines: true,
  showAxisLabels: true,
  xAxisLabel: 'Categories',
  yAxisLabel: 'Values',
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 20,
  paddingRight: 20,
  aspectRatio: 2,
  animationEnabled: true,
  barConfig: {
    borderRadius: 4,
    barThickness: 'flex',
    grouped: true,
  },
  lineConfig: {
    tension: 0.4,
    pointStyle: 'circle',
    pointRadius: 4,
    fill: false,
  },
  datasetConfigs: [
    createDefaultDatasetConfig(0, 'Dataset 1'),
    createDefaultDatasetConfig(1, 'Dataset 2'),
  ],
};
