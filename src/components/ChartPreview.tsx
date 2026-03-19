import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
  RadarController,
  PolarAreaController,
  ChartOptions,
  ChartData as ChartJSData,
  Plugin,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Line, Pie, Doughnut, Scatter, Radar, PolarArea } from 'react-chartjs-2';
import { ChartType, ChartData, ChartCustomization, BarShape } from '../types/chart';
import { SEMANTIC_COLORS } from '../data/palettes';
import { formatNumber } from '../utils/numberFormat';
import { isProportionChart } from '../utils/chartHelpers';
import { DEFAULT_COLORS } from '../utils/chartDefaults';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
  RadarController,
  PolarAreaController,
  ChartDataLabels
);

interface ChartPreviewProps {
  chartType: ChartType;
  chartData: ChartData;
  customization: ChartCustomization;
  isDarkMode: boolean;
  chartRef: React.RefObject<ChartJS>;
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Returns true if text should be white on a given background hex color */
function needsWhiteText(hexColor: string): boolean {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
  if (!result) return false;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// ── Custom bar shape plugin ───────────────────────────────────────────────────
// We store the active shape config in a module-level object so the globally
// registered plugin can read it without any React lifecycle ordering issues.
// Using a globally registered plugin ensures it fires for every chart update,
// regardless of when react-chartjs-2 calls chart.update() internally.
const _barShapeState: { shape: BarShape; horizontal: boolean } = {
  shape: 'rectangle',
  horizontal: false,
};

/** Draw a custom bar shape path on a canvas 2D context */
function drawBarShape(
  ctx: CanvasRenderingContext2D,
  shape: BarShape,
  x: number,
  y: number,
  w: number,
  h: number,
  horizontal: boolean,
): void {
  ctx.beginPath();
  switch (shape) {
    case 'rounded-pill': {
      const r = Math.min(Math.abs(w), Math.abs(h)) / 2;
      if (horizontal) {
        // Pill grows left or right: round both ends
        const left = Math.min(x, x + w);
        const top = y - Math.abs(h) / 2;
        const width = Math.abs(w);
        const height = Math.abs(h);
        // Arc-based rounded rect for broad browser compatibility
        ctx.moveTo(left + r, top);
        ctx.lineTo(left + width - r, top);
        ctx.arcTo(left + width, top, left + width, top + r, r);
        ctx.lineTo(left + width, top + height - r);
        ctx.arcTo(left + width, top + height, left + width - r, top + height, r);
        ctx.lineTo(left + r, top + height);
        ctx.arcTo(left, top + height, left, top + height - r, r);
        ctx.lineTo(left, top + r);
        ctx.arcTo(left, top, left + r, top, r);
      } else {
        // Pill grows up or down: round both ends
        const left = x - Math.abs(w) / 2;
        const top = Math.min(y, y + h);
        const width = Math.abs(w);
        const height = Math.abs(h);
        ctx.moveTo(left + r, top);
        ctx.lineTo(left + width - r, top);
        ctx.arcTo(left + width, top, left + width, top + r, r);
        ctx.lineTo(left + width, top + height - r);
        ctx.arcTo(left + width, top + height, left + width - r, top + height, r);
        ctx.lineTo(left + r, top + height);
        ctx.arcTo(left, top + height, left, top + height - r, r);
        ctx.lineTo(left, top + r);
        ctx.arcTo(left, top, left + r, top, r);
      }
      ctx.closePath();
      break;
    }
    case 'chevron': {
      // Arrow/chevron: rectangle body with pointed leading edge, notched trailing edge
      const ARROW_RATIO = 0.2; // portion of the bar length used for the point
      if (horizontal) {
        // Horizontal: bar goes left→right (or right→left)
        const left = Math.min(x, x + w);
        const right = Math.max(x, x + w);
        const top = y - Math.abs(h) / 2;
        const bottom = y + Math.abs(h) / 2;
        const mid = (top + bottom) / 2;
        const arrowSize = Math.abs(h) * ARROW_RATIO;
        const growing = w >= 0; // true when bar extends right
        if (growing) {
          // Point on the right, notch on the left
          ctx.moveTo(left + arrowSize, top);
          ctx.lineTo(right - arrowSize, top);
          ctx.lineTo(right, mid);
          ctx.lineTo(right - arrowSize, bottom);
          ctx.lineTo(left + arrowSize, bottom);
          ctx.lineTo(left, mid);
        } else {
          // Point on the left, notch on the right
          ctx.moveTo(right - arrowSize, top);
          ctx.lineTo(left + arrowSize, top);
          ctx.lineTo(left, mid);
          ctx.lineTo(left + arrowSize, bottom);
          ctx.lineTo(right - arrowSize, bottom);
          ctx.lineTo(right, mid);
        }
      } else {
        // Vertical: bar goes up (negative h in canvas coords)
        const left = x - Math.abs(w) / 2;
        const right = x + Math.abs(w) / 2;
        const top = Math.min(y, y + h);
        const bottom = Math.max(y, y + h);
        const mid = (left + right) / 2;
        const arrowSize = Math.abs(w) * ARROW_RATIO;
        const growing = h <= 0; // bar grows upward (y decreases)
        if (growing) {
          // Point on the top, notch on the bottom
          ctx.moveTo(left, bottom - arrowSize);
          ctx.lineTo(mid, top);
          ctx.lineTo(right, bottom - arrowSize);
          ctx.lineTo(right, bottom);
          ctx.lineTo(mid + arrowSize, bottom);
          // Notch
          ctx.lineTo(mid, bottom - arrowSize);
          ctx.lineTo(mid - arrowSize, bottom);
          ctx.lineTo(left, bottom);
        } else {
          // Point on the bottom, notch on the top
          ctx.moveTo(left, top + arrowSize);
          ctx.lineTo(mid, bottom);
          ctx.lineTo(right, top + arrowSize);
          ctx.lineTo(right, top);
          ctx.lineTo(mid + arrowSize, top);
          ctx.lineTo(mid, top + arrowSize);
          ctx.lineTo(mid - arrowSize, top);
          ctx.lineTo(left, top);
        }
      }
      ctx.closePath();
      break;
    }
    case 'hexagon': {
      if (horizontal) {
        const left = Math.min(x, x + w);
        const right = Math.max(x, x + w);
        const top = y - Math.abs(h) / 2;
        const bottom = y + Math.abs(h) / 2;
        const midY = (top + bottom) / 2;
        const indent = Math.abs(h) * 0.25;
        ctx.moveTo(left + indent, top);
        ctx.lineTo(right - indent, top);
        ctx.lineTo(right, midY);
        ctx.lineTo(right - indent, bottom);
        ctx.lineTo(left + indent, bottom);
        ctx.lineTo(left, midY);
      } else {
        const left = x - Math.abs(w) / 2;
        const right = x + Math.abs(w) / 2;
        const top = Math.min(y, y + h);
        const bottom = Math.max(y, y + h);
        const midX = (left + right) / 2;
        const indent = Math.abs(w) * 0.25;
        ctx.moveTo(midX, top);
        ctx.lineTo(right, top + indent);
        ctx.lineTo(right, bottom - indent);
        ctx.lineTo(midX, bottom);
        ctx.lineTo(left, bottom - indent);
        ctx.lineTo(left, top + indent);
      }
      ctx.closePath();
      break;
    }
    case 'diamond': {
      if (horizontal) {
        const left = Math.min(x, x + w);
        const right = Math.max(x, x + w);
        const midX = (left + right) / 2;
        const midY = y;
        const top = y - Math.abs(h) / 2;
        const bottom = y + Math.abs(h) / 2;
        ctx.moveTo(left, midY);
        ctx.lineTo(midX, top);
        ctx.lineTo(right, midY);
        ctx.lineTo(midX, bottom);
      } else {
        const left = x - Math.abs(w) / 2;
        const right = x + Math.abs(w) / 2;
        const top = Math.min(y, y + h);
        const bottom = Math.max(y, y + h);
        const midX = (left + right) / 2;
        const midY = (top + bottom) / 2;
        ctx.moveTo(midX, top);
        ctx.lineTo(right, midY);
        ctx.lineTo(midX, bottom);
        ctx.lineTo(left, midY);
      }
      ctx.closePath();
      break;
    }
    case 'triangle': {
      if (horizontal) {
        const left = Math.min(x, x + w);
        const right = Math.max(x, x + w);
        const top = y - Math.abs(h) / 2;
        const bottom = y + Math.abs(h) / 2;
        const growing = w >= 0;
        if (growing) {
          ctx.moveTo(left, top);
          ctx.lineTo(right, y);
          ctx.lineTo(left, bottom);
        } else {
          ctx.moveTo(right, top);
          ctx.lineTo(left, y);
          ctx.lineTo(right, bottom);
        }
      } else {
        const left = x - Math.abs(w) / 2;
        const right = x + Math.abs(w) / 2;
        const top = Math.min(y, y + h);
        const bottom = Math.max(y, y + h);
        const midX = (left + right) / 2;
        const growing = h <= 0; // growing upward
        if (growing) {
          ctx.moveTo(left, bottom);
          ctx.lineTo(midX, top);
          ctx.lineTo(right, bottom);
        } else {
          ctx.moveTo(left, top);
          ctx.lineTo(midX, bottom);
          ctx.lineTo(right, top);
        }
      }
      ctx.closePath();
      break;
    }
    default:
      break;
  }
}

/** Globally registered plugin that draws custom bar shapes using _barShapeState. */
const customBarShapePlugin: Plugin = {
  id: 'customBarShape',
  afterDatasetsDraw(chart) {
    const { shape, horizontal } = _barShapeState;
    if (shape === 'rectangle') return; // nothing to override

    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.type !== 'bar') return;

      meta.data.forEach((element, index) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el = element as any;
        const props = el.getProps(['x', 'y', 'base', 'width', 'height'], true);

        let barX: number, barY: number, barW: number, barH: number;
        if (horizontal) {
          // el.x = value end, el.base = baseline, el.y = center, el.height = thickness
          barX = props.base;
          barY = props.y;
          barW = props.x - props.base;
          barH = Math.abs(props.height ?? el.height ?? 0);
        } else {
          // el.x = center, el.base = baseline, el.y = value top, el.width = thickness
          barX = props.x;
          barY = props.base;
          barW = Math.abs(props.width ?? el.width ?? 0);
          barH = props.y - props.base;
        }

        if (barW === 0 || barH === 0) return;

        // Get color from dataset
        const bgColors = dataset.backgroundColor;
        const color = Array.isArray(bgColors) ? bgColors[index] : bgColors;

        ctx.save();

        // Clear the original bar area
        if (horizontal) {
          const left = Math.min(barX, barX + barW);
          const top = barY - barH / 2;
          ctx.clearRect(left - 1, top - 1, Math.abs(barW) + 2, barH + 2);
        } else {
          const left = barX - barW / 2;
          const top = Math.min(barY, barY + barH);
          ctx.clearRect(left - 1, top - 1, barW + 2, Math.abs(barH) + 2);
        }

        // Draw the custom shape
        ctx.fillStyle = typeof color === 'string' ? color : '#0FBF3E';
        drawBarShape(ctx, shape, barX, barY, barW, barH, horizontal);
        ctx.fill();

        ctx.restore();
      });
    });
  },
};

// Register globally once so it fires on every chart.update() call
ChartJS.register(customBarShapePlugin);

export const ChartPreview: React.FC<ChartPreviewProps> = ({
  chartType,
  chartData,
  customization,
  isDarkMode,
  chartRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const getChartJSData = useCallback((): ChartJSData => {
    if (isProportionChart(chartType)) {
      const rawSliceColors = customization.sliceColors ?? [];
      const sliceColors = chartData.labels.map((_, i) =>
        rawSliceColors[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
      );
      const borderColors = sliceColors.map(c => c + 'cc');
      const firstDataset = chartData.datasets[0] ?? { label: '', data: [] };
      const cfg = customization.datasetConfigs[0];
      return {
        labels: chartData.labels,
        datasets: [{
          label: firstDataset.label,
          data: firstDataset.data.map(d => d ?? 0),
          backgroundColor: sliceColors,
          borderColor: borderColors,
          borderWidth: cfg?.borderWidth ?? 2,
        }],
      };
    }

    if (chartType === 'scatter') {
      return {
        datasets: chartData.datasets.map((ds, di) => {
          const cfg = customization.datasetConfigs[di] || customization.datasetConfigs[0];
          const bgColor = typeof cfg?.backgroundColor === 'string'
            ? hexToRgba(cfg.backgroundColor, 0.7)
            : cfg?.backgroundColor;
          return {
            label: ds.label,
            data: ds.data.map((y, x) => ({ x, y: y ?? 0 })),
            backgroundColor: bgColor || '#0FBF3E',
            borderColor: typeof cfg?.borderColor === 'string' ? cfg.borderColor : '#08872B',
            borderWidth: cfg?.borderWidth ?? 2,
            pointStyle: customization.lineConfig.pointStyle as string,
            pointRadius: customization.lineConfig.pointRadius,
          };
        }),
      };
    }

    if (chartType === 'combo') {
      const dsCount = chartData.datasets.length;
      const lineIdx = customization.comboConfig.lineDatasetIndex < 0 || customization.comboConfig.lineDatasetIndex >= dsCount
        ? dsCount - 1
        : customization.comboConfig.lineDatasetIndex;
      return {
        labels: chartData.labels,
        datasets: chartData.datasets.map((ds, di) => {
          const cfg = customization.datasetConfigs[di] || customization.datasetConfigs[0];
          const baseDataset = {
            label: ds.label,
            data: ds.data.map(d => d ?? 0),
            backgroundColor: typeof cfg?.backgroundColor === 'string' ? cfg.backgroundColor : '#0FBF3E',
            borderColor: typeof cfg?.borderColor === 'string' ? cfg.borderColor : '#08872B',
            borderWidth: cfg?.borderWidth ?? 2,
          };
          if (di === lineIdx) {
            const borderColor = typeof cfg?.borderColor === 'string' ? cfg.borderColor : '#08872B';
            const bgColor = typeof cfg?.backgroundColor === 'string'
              ? hexToRgba(cfg.backgroundColor, 0.2)
              : '#0FBF3E33';
            return {
              ...baseDataset,
              type: 'line' as const,
              backgroundColor: bgColor,
              borderColor,
              tension: customization.comboConfig.lineTension,
              pointRadius: customization.comboConfig.linePointRadius,
              fill: customization.comboConfig.lineFill,
              pointStyle: 'circle',
            };
          }
          return {
            ...baseDataset,
            type: 'bar' as const,
            borderRadius: customization.barConfig.borderRadius,
            barThickness: customization.barConfig.barThickness,
          };
        }),
      };
    }

    return {
      labels: chartData.labels,
      datasets: chartData.datasets.map((ds, di) => {
        const cfg = customization.datasetConfigs[di] || customization.datasetConfigs[0];
        const isArea = chartType === 'area';
        const isLine = chartType === 'line' || isArea;

        const bgColor = typeof cfg?.backgroundColor === 'string'
          ? isLine
            ? hexToRgba(cfg.backgroundColor, isArea ? 0.3 : 0.1)
            : cfg.backgroundColor
          : cfg?.backgroundColor;

        const baseDataset = {
          label: ds.label,
          data: ds.data.map(d => d ?? 0),
          backgroundColor: bgColor || '#0FBF3E',
          borderColor: typeof cfg?.borderColor === 'string' ? cfg.borderColor : '#08872B',
          borderWidth: cfg?.borderWidth ?? 2,
        };

        if (isLine || isArea) {
          return {
            ...baseDataset,
            tension: customization.lineConfig.tension,
            pointStyle: customization.lineConfig.pointStyle as string,
            pointRadius: customization.lineConfig.pointRadius,
            fill: isArea || customization.lineConfig.fill,
          };
        }

        if (chartType === 'radar') {
          return {
            ...baseDataset,
            tension: customization.radarConfig.tension,
            pointRadius: customization.radarConfig.pointRadius,
            fill: customization.radarConfig.fill,
          };
        }

        if (chartType === 'bar') {
          return {
            ...baseDataset,
            borderRadius: customization.barConfig.borderRadius,
            barThickness: customization.barConfig.barThickness,
          };
        }

        return baseDataset;
      }),
    };
  }, [chartType, chartData, customization]);

  const getChartOptions = useCallback((): ChartOptions => {
    const c = customization;
    const dark = isDarkMode;
    const hasPalette = !!c.selectedPalette;
    const gridColor = hasPalette
      ? SEMANTIC_COLORS.gray3
      : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');
    const titleColor = hasPalette
      ? (dark ? SEMANTIC_COLORS.white : SEMANTIC_COLORS.black)
      : (dark ? '#f9fafb' : c.titleFont.color);
    const legendColor = hasPalette
      ? (dark ? SEMANTIC_COLORS.white : SEMANTIC_COLORS.black)
      : (dark ? '#d1d5db' : c.legendFont.color);
    const tickColor = hasPalette
      ? SEMANTIC_COLORS.gray3
      : (dark ? '#9ca3af' : c.tickLabelFont.color);
    const axisColor = hasPalette
      ? (dark ? SEMANTIC_COLORS.white : SEMANTIC_COLORS.black)
      : (dark ? '#d1d5db' : c.axisLabelFont.color);

    const isRadial = chartType === 'radar' || chartType === 'polarArea';
    const isProportion = isProportionChart(chartType);
    const totalPieValue = isProportion
      ? chartData.datasets.slice(0, 1).reduce((sum, ds) => sum + ds.data.reduce((s: number, v) => s + (v ?? 0), 0), 0)
      : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datalabelsConfig: any = c.showDataLabels
      ? {
          display: true,
          font: {
            family: c.dataLabelFont.family,
            size: c.dataLabelFont.size,
            weight: c.dataLabelFont.weight,
          },
          formatter: (value: number, ctx: { chart: { data: { datasets: { data: (number | null)[] }[] } }; dataIndex: number }) => {
            const num = typeof value === 'number' ? value : (value as { y?: number })?.y ?? 0;
            const formatted = formatNumber(num, c.numberFormat);
            if (isProportion && c.dataLabelFormat !== 'value') {
              const pct = totalPieValue > 0 ? ((num / totalPieValue) * 100).toFixed(c.numberFormat.decimalPlaces) : '0';
              if (c.dataLabelFormat === 'percentage') return `${pct}%`;
              if (c.dataLabelFormat === 'valueAndPercentage') return `${formatted}\n${pct}%`;
            }
            return formatted;
          },
          anchor: c.dataLabelPosition === 'auto' ? 'center' : c.dataLabelPosition,
          align: c.dataLabelPosition === 'end' ? 'top' : (c.dataLabelPosition === 'start' ? 'bottom' : 'center'),
          // Auto-contrast only when the label sits inside the element (center/start).
          // For 'end' and 'auto', the label floats above/outside on the chart background,
          // so always use the configured font color (avoids invisible white-on-white text).
          color: (ctx: { dataset: { backgroundColor: string | string[] }; dataIndex: number }) => {
            const labelIsInside = c.dataLabelPosition === 'center' || c.dataLabelPosition === 'start';
            if (labelIsInside && (isProportion || chartType === 'bar')) {
              const bg = ctx.dataset.backgroundColor;
              const color = Array.isArray(bg) ? bg[ctx.dataIndex] : bg;
              if (typeof color === 'string' && color.startsWith('#')) {
                return needsWhiteText(color) ? '#ffffff' : c.dataLabelFont.color;
              }
            }
            return c.dataLabelFont.color;
          },
          padding: 4,
          clip: false,
        }
      : { display: false };

    const baseOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: c.aspectRatio,
      animation: c.animationEnabled ? undefined : false,
      layout: {
        padding: {
          top: c.paddingTop,
          bottom: c.paddingBottom,
          left: c.paddingLeft,
          right: c.paddingRight,
        },
      },
      plugins: {
        title: {
          display: !!c.title,
          text: c.title,
          color: titleColor,
          font: {
            family: c.titleFont.family,
            size: c.titleFont.size,
            weight: c.titleFont.weight as 'bold' | 'normal',
          },
        },
        legend: {
          display: c.showLegend,
          position: c.legendPosition,
          labels: {
            color: legendColor,
            font: {
              family: c.legendFont.family,
              size: c.legendFont.size,
              weight: c.legendFont.weight as 'bold' | 'normal',
            },
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: dark ? '#1f2937' : 'rgba(0,0,0,0.8)',
          titleColor: '#f9fafb',
          bodyColor: '#e5e7eb',
          borderColor: dark ? '#374151' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        datalabels: datalabelsConfig as any,
      },
    };

    if (isProportion) {
      return baseOptions;
    }

    if (isRadial) {
      // Radar chart uses a radial/angular scale
      return {
        ...baseOptions,
        scales: {
          r: {
            grid: {
              display: c.showGridlines,
              color: gridColor,
            },
            ticks: {
              color: tickColor,
              font: {
                family: c.tickLabelFont.family,
                size: c.tickLabelFont.size,
                weight: c.tickLabelFont.weight as 'bold' | 'normal',
              },
              callback: (value: number | string) => {
                const num = typeof value === 'number' ? value : parseFloat(String(value));
                if (isNaN(num)) return String(value);
                return formatNumber(num, c.numberFormat);
              },
            },
            pointLabels: {
              color: tickColor,
              font: {
                family: c.tickLabelFont.family,
                size: c.tickLabelFont.size,
                weight: c.tickLabelFont.weight as 'bold' | 'normal',
              },
            },
          },
        },
      } as ChartOptions;
    }

    const isHorizontal = chartType === 'bar' && c.barConfig.horizontal;
    const xLabel = isHorizontal ? c.yAxisLabel : c.xAxisLabel;
    const yLabel = isHorizontal ? c.xAxisLabel : c.yAxisLabel;

    return {
      ...baseOptions,
      ...(isHorizontal ? { indexAxis: 'y' as const } : {}),
      scales: {
        x: {
          stacked: (chartType === 'bar' || chartType === 'combo') && !c.barConfig.grouped,
          grid: {
            display: c.showGridlines,
            color: gridColor,
          },
          ticks: {
            color: tickColor,
            font: {
              family: c.tickLabelFont.family,
              size: c.tickLabelFont.size,
              weight: c.tickLabelFont.weight as 'bold' | 'normal',
            },
            ...(isHorizontal ? {
              callback: (value: number | string) => {
                const num = typeof value === 'number' ? value : parseFloat(String(value));
                if (isNaN(num)) return String(value);
                return formatNumber(num, c.numberFormat);
              },
            } : {}),
          },
          title: {
            display: c.showAxisLabels && !!xLabel,
            text: xLabel,
            color: axisColor,
            font: {
              family: c.axisLabelFont.family,
              size: c.axisLabelFont.size,
              weight: c.axisLabelFont.weight as 'bold' | 'normal',
            },
          },
        },
        y: {
          stacked: (chartType === 'bar' || chartType === 'combo') && !c.barConfig.grouped,
          grid: {
            display: c.showGridlines,
            color: gridColor,
          },
          ticks: {
            color: tickColor,
            font: {
              family: c.tickLabelFont.family,
              size: c.tickLabelFont.size,
              weight: c.tickLabelFont.weight as 'bold' | 'normal',
            },
            ...(!isHorizontal ? {
              callback: (value: number | string) => {
                const num = typeof value === 'number' ? value : parseFloat(String(value));
                if (isNaN(num)) return String(value);
                return formatNumber(num, c.numberFormat);
              },
            } : {}),
          },
          title: {
            display: c.showAxisLabels && !!yLabel,
            text: yLabel,
            color: axisColor,
            font: {
              family: c.axisLabelFont.family,
              size: c.axisLabelFont.size,
              weight: c.axisLabelFont.weight as 'bold' | 'normal',
            },
          },
        },
      },
    } as ChartOptions;
  }, [chartType, customization, isDarkMode, chartData]);

  const data = getChartJSData();
  const options = getChartOptions();

  // Update the module-level state that the globally registered plugin reads.
  // This happens synchronously during render, before Chart.js draws.
  const barShape = customization.barConfig?.shape ?? 'rectangle';
  const isBarOrCombo = chartType === 'bar' || chartType === 'combo';
  _barShapeState.shape = isBarOrCombo ? barShape : 'rectangle';
  _barShapeState.horizontal = customization.barConfig.horizontal;

  useEffect(() => {
    document.fonts.ready.then(() => {
      chartRef.current?.update();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerHeight(entries[0].contentRect.height);
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    ro.observe(el);
    setContainerHeight(el.clientHeight);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const aspectRatio = customization.aspectRatio ?? 2;
  const containerReady = containerHeight > 10 && containerWidth > 10;
  const isWidthConstrained = containerReady && containerWidth / aspectRatio <= containerHeight;
  const computedWidth = containerReady
    ? isWidthConstrained ? containerWidth : containerHeight * aspectRatio
    : undefined;
  const computedHeight = containerReady
    ? isWidthConstrained ? containerWidth / aspectRatio : containerHeight
    : undefined;

  const chartProps = {
    ref: chartRef as React.Ref<ChartJS>,
    data,
    options,
  } as Record<string, unknown>;

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return <Bar {...(chartProps as Parameters<typeof Bar>[0])} />;
      case 'line':
        return <Line {...(chartProps as Parameters<typeof Line>[0])} />;
      case 'area':
        return <Line {...(chartProps as Parameters<typeof Line>[0])} />;
      case 'pie':
        return <Pie {...(chartProps as Parameters<typeof Pie>[0])} />;
      case 'doughnut':
        return <Doughnut {...(chartProps as Parameters<typeof Doughnut>[0])} />;
      case 'scatter':
        return <Scatter {...(chartProps as Parameters<typeof Scatter>[0])} />;
      case 'radar':
        return <Radar {...(chartProps as Parameters<typeof Radar>[0])} />;
      case 'polarArea':
        return <PolarArea {...(chartProps as Parameters<typeof PolarArea>[0])} />;
      case 'combo':
        return <Bar {...(chartProps as Parameters<typeof Bar>[0])} />;
      default:
        return <Bar {...(chartProps as Parameters<typeof Bar>[0])} />;
    }
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="w-full" style={{ maxWidth: computedWidth, maxHeight: computedHeight, margin: '0 auto' }}>
        {renderChart()}
      </div>
    </div>
  );
};
