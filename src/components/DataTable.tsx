import React, { useRef, useCallback } from 'react';
import { ChartData } from '../types/chart';

interface DataTableProps {
  chartData: ChartData;
  onUpdateLabel: (index: number, value: string) => void;
  onUpdateCell: (datasetIndex: number, labelIndex: number, value: string) => void;
  onUpdateDatasetLabel: (datasetIndex: number, label: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onAddColumn: () => void;
  onRemoveColumn: (datasetIndex: number) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  chartData,
  onUpdateLabel,
  onUpdateCell,
  onUpdateDatasetLabel,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);

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

  return (
    <div className="p-4 flex-1 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Data Table
        </h2>
        <div className="flex gap-1">
          <button
            onClick={onAddColumn}
            className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
            title="Add dataset column"
          >
            + Col
          </button>
          <button
            onClick={onAddRow}
            className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
            title="Add data row"
          >
            + Row
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th className="text-left pb-1 pr-1">
                <span className="text-gray-500 dark:text-gray-400 font-medium text-xs">Label</span>
              </th>
              {chartData.datasets.map((ds, di) => (
                <th key={di} className="pb-1 px-1">
                  <div className="flex items-center gap-0.5">
                    <input
                      value={ds.label}
                      onChange={e => onUpdateDatasetLabel(di, e.target.value)}
                      className="w-full min-w-0 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-center"
                      placeholder={`Dataset ${di + 1}`}
                    />
                    {chartData.datasets.length > 1 && (
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
                {chartData.datasets.map((ds, di) => (
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
    </div>
  );
};
