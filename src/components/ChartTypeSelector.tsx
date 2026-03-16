import React from 'react';
import { ChartType } from '../types/chart';

interface ChartTypeSelectorProps {
  selectedType: ChartType;
  onChange: (type: ChartType) => void;
}

const CHART_TYPES: { type: ChartType; label: string; icon: string }[] = [
  { type: 'bar', label: 'Bar', icon: '📊' },
  { type: 'line', label: 'Line', icon: '📈' },
  { type: 'pie', label: 'Pie', icon: '🥧' },
  { type: 'doughnut', label: 'Doughnut', icon: '🍩' },
  { type: 'scatter', label: 'Scatter', icon: '✦' },
  { type: 'area', label: 'Area', icon: '🏔' },
];

export const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({ selectedType, onChange }) => {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
        Chart Type
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {CHART_TYPES.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
              selectedType === type
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
