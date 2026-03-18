import React from 'react';

interface NewChartDialogProps {
  onNewChart: () => void;
  onSaveAndNew: () => void;
  onClose: () => void;
}

export const NewChartDialog: React.FC<NewChartDialogProps> = ({
  onNewChart,
  onSaveAndNew,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Start a new chart?</h2>
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

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Any unsaved changes will be lost.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onSaveAndNew}
              className="w-full px-4 py-2 bg-accent hover:bg-accent-5 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Save &amp; New
            </button>
            <button
              onClick={onNewChart}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              New Chart
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
