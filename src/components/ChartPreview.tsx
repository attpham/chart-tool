import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
  ChartOptions,
  ChartData as ChartJSData,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Line, Pie, Doughnut, Scatter } from 'react-chartjs-2';
import { ChartType, ChartData, ChartCustomization } from '../types/chart';
import { SEMANTIC_COLORS } from '../data/palettes';
import { formatNumber } from '../utils/numberFormat';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
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
  const getPieColors = useCallback((dataLength: number): string[] => {
    return customization.datasetConfigs.slice(0, dataLength).map(c =>
      typeof c.backgroundColor === 'string' ? c.backgroundColor : c.backgroundColor[0]
    );
  }, [customization.datasetConfigs]);

  const getChartJSData = useCallback((): ChartJSData => {
    if (chartType === 'pie' || chartType === 'doughnut') {
      return {
        labels: chartData.labels,
        datasets: chartData.datasets.map((ds, di) => {
          const cfg = customization.datasetConfigs[di] || customization.datasetConfigs[0];
          return {
            label: ds.label,
            data: ds.data.map(d => d ?? 0),
            backgroundColor: getPieColors(chartData.labels.length),
            borderColor: getPieColors(chartData.labels.length).map(c => c + 'cc'),
            borderWidth: cfg?.borderWidth ?? 2,
          };
        }),
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
  }, [chartType, chartData, customization, getPieColors]);

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

    const isPieOrDoughnut = chartType === 'pie' || chartType === 'doughnut';
    const totalPieValue = isPieOrDoughnut
      ? chartData.datasets.reduce((sum, ds) => sum + ds.data.reduce((s: number, v) => s + (v ?? 0), 0), 0)
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
            if (isPieOrDoughnut && c.dataLabelFormat !== 'value') {
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
            if (labelIsInside && (isPieOrDoughnut || chartType === 'bar')) {
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

    if (isPieOrDoughnut) {
      return baseOptions;
    }

    return {
      ...baseOptions,
      scales: {
        x: {
          stacked: chartType === 'bar' && !c.barConfig.grouped,
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
          },
          title: {
            display: c.showAxisLabels && !!c.xAxisLabel,
            text: c.xAxisLabel,
            color: axisColor,
            font: {
              family: c.axisLabelFont.family,
              size: c.axisLabelFont.size,
              weight: c.axisLabelFont.weight as 'bold' | 'normal',
            },
          },
        },
        y: {
          stacked: chartType === 'bar' && !c.barConfig.grouped,
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
          title: {
            display: c.showAxisLabels && !!c.yAxisLabel,
            text: c.yAxisLabel,
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
