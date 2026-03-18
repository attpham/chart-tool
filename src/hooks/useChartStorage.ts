import { useState, useCallback, useRef } from 'react';
import { AppState, SavedChart } from '../types/chart';

const AUTOSAVE_KEY = 'chart-tool-autosave';
const SAVED_CHARTS_KEY = 'chart-tool-saved-charts';
const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 500;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadSavedChartsFromStorage(): SavedChart[] {
  try {
    const raw = localStorage.getItem(SAVED_CHARTS_KEY);
    return raw ? (JSON.parse(raw) as SavedChart[]) : [];
  } catch {
    return [];
  }
}

export function useChartStorage() {
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>(loadSavedChartsFromStorage);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback((state: AppState) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ version: SCHEMA_VERSION, state }));
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, DEBOUNCE_MS);
  }, []);

  const loadAutoSave = useCallback((): AppState | null => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { version?: number; state?: AppState };
      return parsed.state ?? null;
    } catch {
      return null;
    }
  }, []);

  const saveChart = useCallback((name: string, state: AppState, existingId?: string) => {
    setSavedCharts(prev => {
      let newCharts: SavedChart[];
      if (existingId) {
        newCharts = prev.map(c =>
          c.id === existingId
            ? { ...c, name, state, savedAt: new Date().toISOString() }
            : c
        );
      } else {
        const newChart: SavedChart = {
          id: generateId(),
          name,
          version: SCHEMA_VERSION,
          savedAt: new Date().toISOString(),
          state,
        };
        newCharts = [...prev, newChart];
      }
      try {
        localStorage.setItem(SAVED_CHARTS_KEY, JSON.stringify(newCharts));
      } catch (e) {
        console.warn('Save chart failed:', e);
      }
      return newCharts;
    });
  }, []);

  const deleteChart = useCallback((id: string) => {
    setSavedCharts(prev => {
      const newCharts = prev.filter(c => c.id !== id);
      try {
        localStorage.setItem(SAVED_CHARTS_KEY, JSON.stringify(newCharts));
      } catch (e) {
        console.warn('Delete chart failed:', e);
      }
      return newCharts;
    });
  }, []);

  const renameChart = useCallback((id: string, newName: string) => {
    setSavedCharts(prev => {
      const newCharts = prev.map(c => (c.id === id ? { ...c, name: newName } : c));
      try {
        localStorage.setItem(SAVED_CHARTS_KEY, JSON.stringify(newCharts));
      } catch (e) {
        console.warn('Rename chart failed:', e);
      }
      return newCharts;
    });
  }, []);

  const exportConfig = useCallback((state: AppState) => {
    const title = state.customization.title || 'chart';
    const data = JSON.stringify({ version: SCHEMA_VERSION, state }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.chart.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importConfig = useCallback((): Promise<AppState> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target?.result as string) as { version?: number; state?: AppState } | AppState;
            const state = ('state' in parsed && parsed.state) ? parsed.state : (parsed as AppState);
            if (!state.chartType || !state.chartData || !state.customization) {
              throw new Error('Invalid chart config file: missing required fields');
            }
            resolve(state);
          } catch (err) {
            reject(err instanceof Error ? err : new Error('Invalid JSON file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      };
      input.click();
    });
  }, []);

  return {
    savedCharts,
    autoSave,
    loadAutoSave,
    saveChart,
    deleteChart,
    renameChart,
    exportConfig,
    importConfig,
  };
}
