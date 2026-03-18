import { useState, useCallback } from 'react';
import { ChartData } from '../types/chart';
import { DEFAULT_CHART_DATA } from '../utils/chartDefaults';

export function useChartData() {
  const [chartData, setChartData] = useState<ChartData>(DEFAULT_CHART_DATA);

  const updateLabel = useCallback((index: number, value: string) => {
    setChartData(prev => {
      const newLabels = [...prev.labels];
      newLabels[index] = value;
      return { ...prev, labels: newLabels };
    });
  }, []);

  const updateCell = useCallback((datasetIndex: number, labelIndex: number, value: string) => {
    setChartData(prev => {
      const newDatasets = prev.datasets.map((ds, di) => {
        if (di !== datasetIndex) return ds;
        const newData = [...ds.data];
        newData[labelIndex] = value === '' ? null : parseFloat(value) || 0;
        return { ...ds, data: newData };
      });
      return { ...prev, datasets: newDatasets };
    });
  }, []);

  const updateDatasetLabel = useCallback((datasetIndex: number, label: string) => {
    setChartData(prev => {
      const newDatasets = prev.datasets.map((ds, di) =>
        di === datasetIndex ? { ...ds, label } : ds
      );
      return { ...prev, datasets: newDatasets };
    });
  }, []);

  const addRow = useCallback(() => {
    setChartData(prev => ({
      ...prev,
      labels: [...prev.labels, `Label ${prev.labels.length + 1}`],
      datasets: prev.datasets.map(ds => ({
        ...ds,
        data: [...ds.data, 0],
      })),
    }));
  }, []);

  const removeRow = useCallback((index: number) => {
    setChartData(prev => ({
      ...prev,
      labels: prev.labels.filter((_, i) => i !== index),
      datasets: prev.datasets.map(ds => ({
        ...ds,
        data: ds.data.filter((_, i) => i !== index),
      })),
    }));
  }, []);

  const addColumn = useCallback(() => {
    setChartData(prev => {
      const newLabel = `Dataset ${prev.datasets.length + 1}`;
      return {
        ...prev,
        datasets: [
          ...prev.datasets,
          {
            label: newLabel,
            data: new Array(prev.labels.length).fill(0),
          },
        ],
      };
    });
  }, []);

  const removeColumn = useCallback((datasetIndex: number) => {
    setChartData(prev => ({
      ...prev,
      datasets: prev.datasets.filter((_, i) => i !== datasetIndex),
    }));
  }, []);

  const loadChartData = useCallback((data: ChartData) => {
    setChartData(data);
  }, []);

  const importData = loadChartData;

  return {
    chartData,
    updateLabel,
    updateCell,
    updateDatasetLabel,
    addRow,
    removeRow,
    addColumn,
    removeColumn,
    importData,
    loadChartData,
  };
}
