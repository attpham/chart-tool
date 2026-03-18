import React, { useRef, useCallback, useState } from 'react';
import { ChartData, ChartType } from '../types/chart';
import { parseTabularText, parseTabularFile } from '../utils/parseTabularData';
import { isProportionChart } from '../utils/chartHelpers';

interface DataTableProps {
  chartData: ChartData;
  chartType: ChartType;
  onUpdateLabel: (index: number, value: string) => void;
  onUpdateCell: (datasetIndex: number, labelIndex: number, value: string) => void;
  onUpdateDatasetLabel: (datasetIndex: number, label: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onAddColumn: () => void;
  onRemoveColumn: (datasetIndex: number) => void;
  onImportData: (data: ChartData) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  chartData,
  chartType,
  onUpdateLabel,
  onUpdateCell,
  onUpdateDatasetLabel,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  onImportData,
}) => {
  const isProportion = isProportionChart(chartType);
  const tableRef = useRef<HTMLTableElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const inputs = tableRef.current?.querySelectorAll('input[data-cell]') as NodeListOf<HTMLInputElement>;
      if (!inputs) return;
      const currentIndex = Array.from(inputs).findIndex(
        el => el.dataset.row === String(row) && el.dataset.col === String(col)
      );
      const nextInput = inputs[currentIndex + 1] || inputs[0];
      nextInput?.focus();
    }
  }, []);

  // ── Paste from text ──────────────────────────────────────────────────────────

  const applyPastedText = useCallback((text: string) => {
    const { data, error } = parseTabularText(text);
    if (error || data.labels.length === 0) {
      setPasteError(error ?? 'Could not parse data. Make sure it has a header row and at least one data row.');
      return;
    }
    onImportData(data);
    setShowPasteModal(false);
    setPasteText('');
    setPasteError(null);
  }, [onImportData]);

  const handlePasteSubmit = useCallback(() => {
    applyPastedText(pasteText);
  }, [pasteText, applyPastedText]);

  // ── File import ──────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.tsv') && !name.endsWith('.txt')) {
      alert('Please upload a .csv, .tsv, or .txt file.');
      return;
    }
    const { data, error } = await parseTabularFile(file);
    if (error || data.labels.length === 0) {
      alert(error ?? 'Could not parse the file. Please check its format.');
      return;
    }
    onImportData(data);
  }, [onImportData]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-imported
    e.target.value = '';
  }, [handleFile]);

  // ── Drag and drop ────────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFile(file);
    } else {
      // Try plain text (e.g., dragged selection)
      const text = e.dataTransfer.getData('text/plain');
      if (text) applyPastedText(text);
    }
  }, [handleFile, applyPastedText]);

  return (
    <div
      className={`p-4 flex-1 overflow-auto relative${isDragging ? ' ring-2 ring-accent ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-accent/10 border-2 border-dashed border-accent rounded-lg pointer-events-none">
          <span className="text-accent font-semibold text-sm">Drop CSV / TSV file here</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Data Table
        </h2>
        <div className="flex gap-1">
          {!isProportion && (
            <button
              onClick={onAddColumn}
              className="px-2 py-1 text-xs bg-accent hover:bg-accent-5 text-white rounded transition-colors"
              title="Add dataset column"
            >
              + Col
            </button>
          )}
          <button
            onClick={onAddRow}
            className="px-2 py-1 text-xs bg-accent hover:bg-accent-5 text-white rounded transition-colors"
            title="Add data row"
          >
            + Row
          </button>
        </div>
      </div>

      {/* Import controls */}
      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => { setShowPasteModal(true); setPasteError(null); }}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Paste TSV/CSV data from clipboard"
        >
          &#128203; Paste Data
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Import a CSV or TSV file"
        >
          &#128194; Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th className="text-left pb-1 pr-1">
                <span className="text-gray-500 dark:text-gray-400 font-medium text-xs">Label</span>
              </th>
              {(isProportion ? chartData.datasets.slice(0, 1) : chartData.datasets).map((ds, di) => (
                <th key={di} className="pb-1 px-1">
                  <div className="flex items-center gap-0.5">
                    <input
                      value={isProportion ? 'Values' : ds.label}
                      onChange={e => !isProportion && onUpdateDatasetLabel(di, e.target.value)}
                      readOnly={isProportion}
                      className="w-full min-w-0 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-center"
                      placeholder={`Dataset ${di + 1}`}
                    />
                    {!isProportion && chartData.datasets.length > 1 && (
                      <button
                        onClick={() => onRemoveColumn(di)}
                        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 rounded"
                        title="Remove dataset"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.labels.map((label, li) => (
              <tr key={li} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="pr-1">
                  {chartData.labels.length > 1 && (
                    <button
                      onClick={() => onRemoveRow(li)}
                      className="w-5 h-5 flex items-center justify-center text-red-400 hover:text-red-600 rounded text-xs"
                      title="Remove row"
                    >
                      ×
                    </button>
                  )}
                </td>
                <td className="pr-1 py-0.5">
                  <input
                    value={label}
                    onChange={e => onUpdateLabel(li, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, -1, li)}
                    data-cell="true"
                    data-row="-1"
                    data-col={String(li)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    placeholder="Label"
                  />
                </td>
                {(isProportion ? chartData.datasets.slice(0, 1) : chartData.datasets).map((ds, di) => (
                  <td key={di} className="px-1 py-0.5">
                    <input
                      type="number"
                      value={ds.data[li] === null ? '' : String(ds.data[li])}
                      onChange={e => onUpdateCell(di, li, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, di, li)}
                      data-cell="true"
                      data-row={String(di)}
                      data-col={String(li)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-right"
                      placeholder="0"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paste modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[500px] max-w-[95vw] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Paste Data</h3>
              <button
                onClick={() => { setShowPasteModal(false); setPasteText(''); setPasteError(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paste tab-separated (Excel / Google Sheets) or comma-separated data below.
              The first row should be column headers and the first column should be category labels.
            </p>
            <textarea
              autoFocus
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteError(null); }}
              rows={10}
              className="w-full text-xs font-mono border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-y"
              placeholder={"Category\tDataset 1\tDataset 2\nJanuary\t65\t28\nFebruary\t59\t48"}
            />
            {pasteError && (
              <p className="text-xs text-red-500 dark:text-red-400">{pasteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowPasteModal(false); setPasteText(''); setPasteError(null); }}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                className="px-3 py-1.5 text-sm bg-accent hover:bg-accent-5 disabled:opacity-50 text-white rounded transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
