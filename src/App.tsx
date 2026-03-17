import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Chart as ChartJS } from 'chart.js';
import { ChartTypeSelector } from './components/ChartTypeSelector';
import { DataTable } from './components/DataTable';
import { ChartPreview } from './components/ChartPreview';
import { CustomizationPanel } from './components/CustomizationPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { useChartData } from './hooks/useChartData';
import { useChartOptions } from './hooks/useChartOptions';
import { ChartType } from './types/chart';
import { exportToPptx } from './utils/exportToPptx';

export default function App() {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const chartRef = useRef<ChartJS>(null);

  const {
    chartData,
    updateLabel,
    updateCell,
    updateDatasetLabel,
    addRow,
    removeRow,
    addColumn,
    removeColumn,
  } = useChartData();

  const {
    customization,
    updateCustomization,
    updateDatasetConfig,
    syncDatasetConfigs,
  } = useChartOptions();

  useEffect(() => {
    syncDatasetConfigs(chartData.datasets.length, chartData.datasets.map(d => d.label));
  }, [chartData.datasets.length, syncDatasetConfigs]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleExport = useCallback(async () => {
    if (!chartRef.current) throw new Error('Chart not ready');
    await exportToPptx(chartRef.current, customization, chartType);
  }, [customization, chartType]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Chart Tool</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Interactive Chart Builder</p>
          </div>
        </div>
        <ThemeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
      </header>

      {/* Three-panel layout */}
      <div className="flex h-[calc(100vh-57px)] overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          <ChartTypeSelector selectedType={chartType} onChange={setChartType} />
          <DataTable
            chartData={chartData}
            onUpdateLabel={updateLabel}
            onUpdateCell={updateCell}
            onUpdateDatasetLabel={updateDatasetLabel}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onAddColumn={addColumn}
            onRemoveColumn={removeColumn}
          />
        </div>

        {/* Center Panel */}
        <div className="flex-1 p-6 overflow-auto flex flex-col">
          <ChartPreview
            chartType={chartType}
            chartData={chartData}
            customization={customization}
            isDarkMode={isDarkMode}
            chartRef={chartRef}
          />
        </div>

        {/* Right Panel */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Customization
            </h2>
          </div>
          <CustomizationPanel
            chartType={chartType}
            customization={customization}
            onUpdateCustomization={updateCustomization}
            onUpdateDatasetConfig={updateDatasetConfig}
            onExport={handleExport}
          />
        </div>
      </div>
    </div>
  );
}
