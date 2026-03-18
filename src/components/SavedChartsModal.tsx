import React, { useState } from 'react';
import { SavedChart } from '../types/chart';

const CHART_TYPE_ICONS: Record<string, string> = {
  bar: '📊',
  line: '📈',
  pie: '🥧',
  doughnut: '🍩',
  scatter: '🔵',
  area: '📉',
};

interface SavedChartsModalProps {
  savedCharts: SavedChart[];
  onLoad: (chart: SavedChart) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onClose: () => void;
}

export const SavedChartsModal: React.FC<SavedChartsModalProps> = ({
  savedCharts,
  onLoad,
  onDelete,
  onRename,
  onClose,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleRenameStart = (chart: SavedChart) => {
    setRenamingId(chart.id);
    setRenameValue(chart.name);
  };

  const handleRenameSubmit = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleRenameSubmit(id);
    if (e.key === 'Escape') {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Charts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {savedCharts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">No saved charts yet</p>
              <p className="text-xs mt-1">Click <span className="font-semibold">Save</span> to save your current chart</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {savedCharts.map((chart) => (
                <li
                  key={chart.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {/* Icon */}
                  <span className="text-2xl flex-shrink-0" title={chart.state.chartType}>
                    {CHART_TYPE_ICONS[chart.state.chartType] ?? '📊'}
                  </span>

                  {/* Name & date */}
                  <div className="flex-1 min-w-0">
                    {renamingId === chart.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(chart.id)}
                        onKeyDown={(e) => handleRenameKeyDown(e, chart.id)}
                        className="w-full text-sm font-medium bg-white dark:bg-gray-700 border border-accent rounded px-2 py-0.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        autoFocus
                      />
                    ) : (
                      <p
                        className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                        title="Click to rename"
                        onClick={() => handleRenameStart(chart)}
                      >
                        {chart.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDate(chart.savedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onLoad(chart)}
                      className="px-2.5 py-1 text-xs font-semibold bg-accent hover:bg-accent-5 text-white rounded-md transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleRenameStart(chart)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      title="Rename"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {confirmDeleteId === chart.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { onDelete(chart.id); setConfirmDeleteId(null); }}
                          className="px-2 py-1 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(chart.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
