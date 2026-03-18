import { useState, useCallback } from 'react';
import { ChartCustomization, DatasetConfig } from '../types/chart';
import { DEFAULT_CUSTOMIZATION, createDefaultDatasetConfig } from '../utils/chartDefaults';
import { PaletteId, PALETTE_MAP, SEMANTIC_COLORS } from '../data/palettes';

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
      const palette = prev.selectedPalette ? PALETTE_MAP[prev.selectedPalette] : null;
      const newConfigs: DatasetConfig[] = [];
      for (let i = 0; i < datasetCount; i++) {
        if (existing[i]) {
          newConfigs.push({ ...existing[i], label: datasetLabels[i] || existing[i].label });
        } else {
          const defaultConfig = createDefaultDatasetConfig(i, datasetLabels[i] || `Dataset ${i + 1}`);
          if (palette) {
            const color = palette.colors[i % palette.colors.length];
            defaultConfig.backgroundColor = color;
            defaultConfig.borderColor = color;
          }
          newConfigs.push(defaultConfig);
        }
      }
      return { ...prev, datasetConfigs: newConfigs };
    });
  }, []);

  const syncSliceColors = useCallback((labelCount: number) => {
    setCustomization(prev => {
      const existing = prev.sliceColors ?? [];
      const palette = prev.selectedPalette ? PALETTE_MAP[prev.selectedPalette] : null;
      const newColors: string[] = [];
      for (let i = 0; i < labelCount; i++) {
        if (existing[i]) {
          newColors.push(existing[i]);
        } else {
          const fallback = palette
            ? palette.colors[i % palette.colors.length]
            : createDefaultDatasetConfig(i, '').backgroundColor as string;
          newColors.push(fallback);
        }
      }
      return { ...prev, sliceColors: newColors };
    });
  }, []);

  const applyPalette = useCallback((paletteId: PaletteId, isDarkMode: boolean) => {
    const palette = PALETTE_MAP[paletteId];
    if (!palette) return;

    const textColor = isDarkMode ? SEMANTIC_COLORS.white : SEMANTIC_COLORS.black;
    const gridColor = SEMANTIC_COLORS.gray3;

    setCustomization(prev => {
      const newConfigs = prev.datasetConfigs.map((cfg, i) => ({
        ...cfg,
        backgroundColor: palette.colors[i % palette.colors.length],
        borderColor: palette.colors[i % palette.colors.length],
      }));

      const newSliceColors = prev.sliceColors.map((_, i) =>
        palette.colors[i % palette.colors.length]
      );

      return {
        ...prev,
        selectedPalette: paletteId,
        datasetConfigs: newConfigs,
        sliceColors: newSliceColors,
        titleFont: { ...prev.titleFont, color: textColor },
        axisLabelFont: { ...prev.axisLabelFont, color: textColor },
        tickLabelFont: { ...prev.tickLabelFont, color: gridColor },
        legendFont: { ...prev.legendFont, color: textColor },
      };
    });
  }, []);

  const loadCustomization = useCallback((custom: ChartCustomization) => {
    setCustomization(custom);
  }, []);

  return {
    customization,
    loadCustomization,
    updateCustomization,
    updateDatasetConfig,
    syncDatasetConfigs,
    syncSliceColors,
    applyPalette,
  };
}
