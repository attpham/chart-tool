import { ChartCustomization, ChartData, DatasetConfig, NumberFormatConfig, RadarConfig, ComboConfig } from '../types/chart';
import { SEMANTIC_COLORS } from '../data/palettes';

// Refactor palette colors: Green 4 primary, Green 2 secondary, then remaining greens
export const DEFAULT_COLORS = [
  '#0FBF3E', // Green 4 (primary)
  '#8CF2A6', // Green 2 (secondary)
  '#BFFFD1', // Green 1
  '#5FED83', // Green 3
  '#08872B', // Green 5
  '#0A241B', // Green 6
];

export const DEFAULT_BORDER_COLORS = DEFAULT_COLORS;

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

export const DEFAULT_NUMBER_FORMAT: NumberFormatConfig = {
  type: 'raw',
  currencySymbol: '$',
  currencyPosition: 'prefix',
  decimalPlaces: 0,
  thousandsSeparator: false,
  prefix: '',
  suffix: '',
};

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
  titleFont: { family: 'Mona Sans', size: 20, weight: 'bold', color: SEMANTIC_COLORS.black },
  axisLabelFont: { family: 'Mona Sans', size: 14, weight: 'bold', color: SEMANTIC_COLORS.black },
  tickLabelFont: { family: 'Mona Sans Mono', size: 12, weight: 'normal', color: SEMANTIC_COLORS.gray3 },
  legendFont: { family: 'Mona Sans', size: 12, weight: 'normal', color: SEMANTIC_COLORS.black },
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
    horizontal: false,
  },
  lineConfig: {
    tension: 0.4,
    pointStyle: 'circle',
    pointRadius: 4,
    fill: false,
  },
  radarConfig: {
    fill: false,
    tension: 0.0,
    pointRadius: 4,
  } as RadarConfig,
  comboConfig: {
    lineDatasetIndex: -1,
    lineTension: 0.3,
    linePointRadius: 4,
    lineFill: false,
  } as ComboConfig,
  datasetConfigs: [
    createDefaultDatasetConfig(0, 'Dataset 1'),
    createDefaultDatasetConfig(1, 'Dataset 2'),
  ],
  sliceColors: [],
  selectedPalette: 'refactor',
  showDataLabels: false,
  dataLabelFont: { family: 'Mona Sans', size: 11, weight: 'normal', color: '#374151' },
  dataLabelFormat: 'value',
  dataLabelDecimalPlaces: 0,
  dataLabelPosition: 'end',
  numberFormat: DEFAULT_NUMBER_FORMAT,
};
