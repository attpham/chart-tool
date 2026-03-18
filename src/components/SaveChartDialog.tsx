import React, { useState, useEffect } from 'react';

interface SaveChartDialogProps {
  initialName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export const SaveChartDialog: React.FC<SaveChartDialogProps> = ({
  initialName,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Save Chart</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chart name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name for this chart"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent placeholder-gray-400 dark:placeholder-gray-500"
            autoFocus
          />

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-accent hover:bg-accent-5 disabled:bg-accent-3 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
