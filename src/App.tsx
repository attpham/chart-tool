import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Chart as ChartJS } from 'chart.js';
import { ChartTypeSelector } from './components/ChartTypeSelector';
import { DataTable } from './components/DataTable';
import { ChartPreview } from './components/ChartPreview';
import { CustomizationPanel } from './components/CustomizationPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { SavedChartsModal } from './components/SavedChartsModal';
import { SaveChartDialog } from './components/SaveChartDialog';
import { NewChartDialog } from './components/NewChartDialog';
import { useChartData } from './hooks/useChartData';
import { useChartOptions } from './hooks/useChartOptions';
import { useChartStorage } from './hooks/useChartStorage';
import { ChartType, ChartData } from './types/chart';
import type { AppState, SavedChart } from './types/chart';
import { PaletteId } from './data/palettes';
import { exportToPptx } from './utils/exportToPptx';
import { DEFAULT_CHART_DATA, DEFAULT_CUSTOMIZATION } from './utils/chartDefaults';

export default function App() {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showMyCharts, setShowMyCharts] = useState(false);
  const [showNewChartDialog, setShowNewChartDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const chartRef = useRef<ChartJS>(null);
  const hasRestoredRef = useRef(false);

  const {
    chartData,
    updateLabel,
    updateCell,
    updateDatasetLabel,
    addRow,
    removeRow,
    addColumn,
    removeColumn,
    importData,
  } = useChartData();

  const {
    customization,
    loadCustomization,
    updateCustomization,
    updateDatasetConfig,
    syncDatasetConfigs,
    applyPalette,
  } = useChartOptions();

  const {
    savedCharts,
    autoSave,
    loadAutoSave,
    clearAutoSave,
    saveChart,
    deleteChart,
    renameChart,
    exportConfig,
    importConfig,
  } = useChartStorage();

  // Restore auto-saved state on first mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const saved = loadAutoSave();
    if (saved) {
      setChartType(saved.chartType);
      setIsDarkMode(saved.isDarkMode);
      importData(saved.chartData);
      loadCustomization(saved.customization);
    }
  }, [loadAutoSave, importData, loadCustomization]);

  // Keep a ref to the latest state to avoid stale closures in save/export callbacks
  const currentState: AppState = { chartType, chartData, customization, isDarkMode };
  const currentStateRef = useRef<AppState>(currentState);
  currentStateRef.current = currentState;

  // Auto-save whenever state changes
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    autoSave(currentStateRef.current);
  }, [chartType, chartData, customization, isDarkMode, autoSave]);

  useEffect(() => {
    syncDatasetConfigs(chartData.datasets.length, chartData.datasets.map(d => d.label));
  }, [chartData.datasets.length, syncDatasetConfigs]);

  const handleImportData = useCallback((data: ChartData) => {
    importData(data);
    // Sync dataset configs immediately for new dataset labels/counts
    syncDatasetConfigs(data.datasets.length, data.datasets.map(d => d.label));
  }, [importData, syncDatasetConfigs]);

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

  const handleApplyPalette = useCallback((paletteId: PaletteId) => {
    applyPalette(paletteId, isDarkMode);
  }, [applyPalette, isDarkMode]);

  const handleSaveChart = useCallback((name: string) => {
    saveChart(name, currentStateRef.current);
    setShowSaveDialog(false);
  }, [saveChart]);

  const handleLoadChart = useCallback((chart: SavedChart) => {
    setChartType(chart.state.chartType);
    setIsDarkMode(chart.state.isDarkMode);
    importData(chart.state.chartData);
    loadCustomization(chart.state.customization);
    setShowMyCharts(false);
  }, [importData, loadCustomization]);

  const handleExportConfig = useCallback(() => {
    exportConfig(currentStateRef.current);
  }, [exportConfig]);

  const handleImportConfig = useCallback(async () => {
    setImportError(null);
    try {
      const state = await importConfig();
      setChartType(state.chartType);
      setIsDarkMode(state.isDarkMode);
      importData(state.chartData);
      loadCustomization(state.customization);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import config');
      setTimeout(() => setImportError(null), 4000);
    }
  }, [importConfig, importData, loadCustomization]);

  const resetToNewChart = useCallback(() => {
    setChartType('bar');
    importData(DEFAULT_CHART_DATA);
    loadCustomization(DEFAULT_CUSTOMIZATION);
    clearAutoSave();
  }, [importData, loadCustomization, clearAutoSave]);

  const handleNewChart = useCallback(() => {
    resetToNewChart();
    setShowNewChartDialog(false);
  }, [resetToNewChart]);

  const handleSaveAndNew = useCallback(() => {
    saveChart(currentStateRef.current.customization.title || 'My Chart', currentStateRef.current);
    resetToNewChart();
    setShowNewChartDialog(false);
  }, [saveChart, resetToNewChart]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Chart Tool</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Interactive Chart Builder</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Import error toast */}
          {importError && (
            <span className="text-xs text-red-500 dark:text-red-400 mr-2">{importError}</span>
          )}
          <button
            onClick={() => setShowNewChartDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Start a new chart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-accent hover:bg-accent-5 text-white rounded-lg transition-colors"
            title="Save current chart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>
          <button
            onClick={() => setShowMyCharts(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="View saved charts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            My Charts
            {savedCharts.length > 0 && (
              <span className="ml-0.5 text-xs bg-accent text-white rounded-full px-1.5 py-px leading-none">
                {savedCharts.length}
              </span>
            )}
          </button>
          <button
            onClick={handleExportConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Export chart config as JSON"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Config
          </button>
          <button
            onClick={handleImportConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Import chart config from JSON"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Import Config
          </button>
          <ThemeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
        </div>
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
            onImportData={handleImportData}
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
            onApplyPalette={handleApplyPalette}
            onExport={handleExport}
          />
        </div>
      </div>

      {/* New Chart Dialog */}
      {showNewChartDialog && (
        <NewChartDialog
          onNewChart={handleNewChart}
          onSaveAndNew={handleSaveAndNew}
          onClose={() => setShowNewChartDialog(false)}
        />
      )}

      {/* Save Chart Dialog */}
      {showSaveDialog && (
        <SaveChartDialog
          initialName={customization.title || 'My Chart'}
          onSave={handleSaveChart}
          onClose={() => setShowSaveDialog(false)}
        />
      )}

      {/* My Charts Modal */}
      {showMyCharts && (
        <SavedChartsModal
          savedCharts={savedCharts}
          onLoad={handleLoadChart}
          onDelete={deleteChart}
          onRename={renameChart}
          onClose={() => setShowMyCharts(false)}
        />
      )}
    </div>
  );
}
