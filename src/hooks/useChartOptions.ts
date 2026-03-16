import { useState, useCallback } from 'react';
import { ChartCustomization, DatasetConfig } from '../types/chart';
import { DEFAULT_CUSTOMIZATION, createDefaultDatasetConfig } from '../utils/chartDefaults';

export function useChartOptions() {
  const [customization, setCustomization] = useState<ChartCustomization>(DEFAULT_CUSTOMIZATION);

  const updateCustomization = useCallback(<K extends keyof ChartCustomization>(
    key: K,
    value: ChartCustomization[K]
  ) => {
    setCustomization(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateDatasetConfig = useCallback((index: number, config: Partial<DatasetConfig>) => {
    setCustomization(prev => {
      const newConfigs = [...prev.datasetConfigs];
      if (newConfigs[index]) {
        newConfigs[index] = { ...newConfigs[index], ...config };
      }
      return { ...prev, datasetConfigs: newConfigs };
    });
  }, []);

  const syncDatasetConfigs = useCallback((datasetCount: number, datasetLabels: string[]) => {
    setCustomization(prev => {
      const existing = prev.datasetConfigs;
      const newConfigs: DatasetConfig[] = [];
      for (let i = 0; i < datasetCount; i++) {
        if (existing[i]) {
          newConfigs.push({ ...existing[i], label: datasetLabels[i] || existing[i].label });
        } else {
          newConfigs.push(createDefaultDatasetConfig(i, datasetLabels[i] || `Dataset ${i + 1}`));
        }
      }
      return { ...prev, datasetConfigs: newConfigs };
    });
  }, []);

  return {
    customization,
    updateCustomization,
    updateDatasetConfig,
    syncDatasetConfigs,
  };
}
